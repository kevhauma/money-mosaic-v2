import { extractFeatures } from './feature-hashing';
import { DEFAULT_FEATURE_CONFIG, type FeatureConfig } from './model-config';
import type {
  ErrorResponse,
  InitRequest,
  InitResponse,
  PredictRequest,
  PredictResponse,
  SerializedArtifacts,
  TrainProgress,
  TrainRequest,
  TrainResponse,
  WorkerRequest,
  WorkerResponse,
} from './category-model.worker.types';

type TfCoreModule = typeof import('@tensorflow/tfjs-core');
type TfLayersModule = typeof import('@tensorflow/tfjs-layers');
type LayersModelInstance = import('@tensorflow/tfjs-layers').LayersModel;

/** Above this sample count the model gets a second, wider hidden layer. */
const LARGE_SAMPLE_THRESHOLD = 200;

/** Below this sample count `validationSplit` is skipped — too few rows to hold any out. */
const VALIDATION_SPLIT_MIN_SAMPLES = 40;

/** Hard cap on training epochs — early stopping usually ends a run well before this (ML-15). */
const MAX_EPOCHS = 120;

// Memoized at module scope (not per-handler-instance): loading + registering the CPU backend is
// expensive and safe to share across every handler instance in this worker/process.
let tfPromise: Promise<{ core: TfCoreModule; layers: TfLayersModule }> | undefined;

const loadTf = (): Promise<{ core: TfCoreModule; layers: TfLayersModule }> => {
  if (!tfPromise) {
    tfPromise = (async () => {
      const core = await import('@tensorflow/tfjs-core');
      const layers = await import('@tensorflow/tfjs-layers');
      await import('@tensorflow/tfjs-backend-cpu');
      await core.setBackend('cpu');
      await core.ready();
      return { core, layers };
    })();
  }
  return tfPromise;
};

const encodeToArrayBuffer = (value: unknown): ArrayBuffer =>
  new TextEncoder().encode(JSON.stringify(value)).buffer as ArrayBuffer;

const decodeFromArrayBuffer = <T>(buffer: ArrayBuffer): T =>
  JSON.parse(new TextDecoder().decode(buffer)) as T;

const captureArtifacts = async (
  core: TfCoreModule,
  model: LayersModelInstance,
): Promise<Omit<SerializedArtifacts, 'categoryIdByIndex'>> => {
  let captured: Omit<SerializedArtifacts, 'categoryIdByIndex'> | undefined;

  await model.save(
    core.io.withSaveHandler(async (modelArtifacts) => {
      captured = {
        modelTopology: encodeToArrayBuffer(modelArtifacts.modelTopology),
        weightSpecs: encodeToArrayBuffer(modelArtifacts.weightSpecs),
        weightData: modelArtifacts.weightData as ArrayBuffer,
      };
      return { modelArtifactsInfo: { dateSaved: new Date(), modelTopologyType: 'JSON' } };
    }),
  );

  if (!captured) throw new Error('Model save handler did not capture any artifacts.');
  return captured;
};

const stackFeatures = (rows: Float32Array[], dim: number): Float32Array => {
  const flat = new Float32Array(rows.length * dim);
  rows.forEach((row, index) => flat.set(row, index * dim));
  return flat;
};

/**
 * Owns one worker's model state (current model, its category-index mapping, and its feature
 * config) plus a FIFO queue so overlapping messages never train/predict concurrently. A factory
 * rather than bare module state so tests can spin up isolated instances instead of sharing one
 * mutable model across cases.
 *
 * `postProgress` defaults to a no-op — the real worker (module scope, bottom of this file) wires it
 * up to the actual `self.postMessage` explicitly. Tests either leave it a no-op (they don't care
 * about progress messages) or inject their own mock to assert on posted `TRAIN_PROGRESS` messages;
 * either way they never touch `self.postMessage`, whose `Window` overload (jsdom's `self`) has a
 * different, incompatible signature from a real Worker's.
 */
export const createCategoryModelWorkerHandler = (
  postProgress: (message: TrainProgress) => void = () => {},
) => {
  let currentModel: LayersModelInstance | undefined;
  // Tracked separately from `currentModel`: `LayersModel.dispose()` frees the model's own weight
  // tensors but leaves the Adam optimizer's per-variable moment-accumulator tensors alive, so the
  // optimizer needs its own explicit `dispose()` whenever a model built via TRAIN is replaced.
  let currentOptimizer: import('@tensorflow/tfjs-core').Optimizer | undefined;
  let categoryIdByIndex: number[] = [];
  let featureConfig: FeatureConfig = DEFAULT_FEATURE_CONFIG;
  let requestQueue: Promise<unknown> = Promise.resolve();

  const replaceModel = (
    model: LayersModelInstance,
    optimizer?: import('@tensorflow/tfjs-core').Optimizer,
  ): void => {
    currentOptimizer?.dispose();
    currentModel?.dispose();
    currentModel = model;
    currentOptimizer = optimizer;
  };

  const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
    const scheduled = requestQueue.then(task, task);
    requestQueue = scheduled.then(
      () => undefined,
      () => undefined,
    );
    return scheduled;
  };

  const processInit = async (request: InitRequest): Promise<InitResponse> => {
    const { core, layers } = await loadTf();

    const modelTopology = decodeFromArrayBuffer(request.artifacts.modelTopology);
    const weightSpecs = decodeFromArrayBuffer(request.artifacts.weightSpecs);
    const loaded = await layers.loadLayersModel(
      core.io.fromMemory({ modelTopology, weightSpecs, weightData: request.artifacts.weightData }),
    );

    replaceModel(loaded);
    categoryIdByIndex = request.artifacts.categoryIdByIndex;
    featureConfig = request.featureConfig;

    return { type: 'INIT_OK' };
  };

  const processTrain = async (request: TrainRequest): Promise<TrainResponse> => {
    const { core, layers } = await loadTf();
    const { samples, featureConfig: config } = request;

    const sortedCategoryIds = [...new Set(samples.map((sample) => sample.categoryId))].sort(
      (a, b) => a - b,
    );
    const numClasses = sortedCategoryIds.length;
    const categoryIndexById = new Map(sortedCategoryIds.map((id, index) => [id, index]));
    const labelIndices = samples.map((sample) => categoryIndexById.get(sample.categoryId)!);

    const classCounts = new Array(numClasses).fill(0) as number[];
    for (const index of labelIndices) classCounts[index]++;
    const classWeight: Record<number, number> = {};
    classCounts.forEach((count, index) => {
      classWeight[index] = samples.length / (numClasses * count);
    });

    const model = layers.sequential();
    model.add(
      layers.layers.dense({
        units: 64,
        activation: 'relu',
        inputShape: [config.dim],
        kernelRegularizer: layers.regularizers.l2({ l2: 0.001 }),
      }),
    );
    model.add(layers.layers.dropout({ rate: 0.5 }));
    if (samples.length >= LARGE_SAMPLE_THRESHOLD) {
      model.add(layers.layers.dense({ units: 32, activation: 'relu' }));
    }
    model.add(layers.layers.dense({ units: numClasses, activation: 'softmax' }));
    const optimizer = core.train.adam(1e-3);
    model.compile({
      optimizer,
      loss: 'sparseCategoricalCrossentropy',
      metrics: ['accuracy'],
    });

    const useValidationSplit = samples.length >= VALIDATION_SPLIT_MIN_SAMPLES;
    const featureRows = samples.map((sample) => extractFeatures(sample, config));

    const xs = core.tensor2d(stackFeatures(featureRows, config.dim), [samples.length, config.dim]);
    const ys = core.tensor1d(labelIndices);

    // Non-terminal — posted per epoch, alongside (never instead of) the eventual TRAIN_OK response.
    const progressCallback = new layers.CustomCallback({
      onEpochEnd: async (epoch, logs) => {
        postProgress({
          type: 'TRAIN_PROGRESS',
          epoch: epoch + 1,
          totalEpochs: MAX_EPOCHS,
          loss: logs?.['loss'] ?? 0,
          accuracy: logs?.['acc'] ?? logs?.['accuracy'] ?? null,
          valLoss: logs?.['val_loss'] ?? null,
        });
      },
    });

    let history;
    try {
      history = await model.fit(xs, ys, {
        epochs: MAX_EPOCHS,
        batchSize: Math.min(32, samples.length),
        verbose: 0,
        classWeight,
        ...(useValidationSplit ? { validationSplit: 0.2 } : {}),
        callbacks: [
          layers.callbacks.earlyStopping({
            monitor: useValidationSplit ? 'val_loss' : 'loss',
            patience: 10,
          }),
          progressCallback,
        ],
      });
    } finally {
      xs.dispose();
      ys.dispose();
    }

    const accuracyHistory = (history.history['acc'] ?? history.history['accuracy']) as
      number[] | undefined;
    const accuracy = accuracyHistory?.at(-1) ?? 0;
    const epochsRun = history.epoch.length;

    const capturedArtifacts = await captureArtifacts(core, model);

    replaceModel(model, optimizer);
    categoryIdByIndex = sortedCategoryIds;
    featureConfig = config;

    return {
      type: 'TRAIN_OK',
      artifacts: { ...capturedArtifacts, categoryIdByIndex: sortedCategoryIds },
      metrics: { accuracy, trainedSampleCount: samples.length, epochsRun },
    };
  };

  const processPredict = async (
    request: PredictRequest,
  ): Promise<PredictResponse | ErrorResponse> => {
    if (!currentModel) {
      return {
        type: 'ERROR',
        message: 'PREDICT requires a loaded model — call INIT or TRAIN first.',
      };
    }

    const { core } = await loadTf();
    const model = currentModel;
    const config = featureConfig;
    const featureRows = request.transactions.map((transaction) =>
      extractFeatures(transaction, config),
    );
    const stacked = stackFeatures(featureRows, config.dim);

    const { indices, probabilities } = core.tidy(() => {
      const xs = core.tensor2d(stacked, [request.transactions.length, config.dim]);
      const probs = model.predict(xs) as import('@tensorflow/tfjs-core').Tensor;
      const idxTensor = core.argMax(probs, -1);
      return {
        indices: Array.from(idxTensor.dataSync()),
        probabilities: probs.arraySync() as number[][],
      };
    });

    const predictions = request.transactions.map((transaction, index) => ({
      id: transaction.id,
      categoryId: categoryIdByIndex[indices[index]],
      confidence: probabilities[index][indices[index]],
    }));

    return { type: 'PREDICT_OK', predictions };
  };

  const handleRequest = (request: WorkerRequest): Promise<WorkerResponse> =>
    enqueue(async (): Promise<WorkerResponse> => {
      try {
        switch (request.type) {
          case 'INIT':
            return await processInit(request);
          case 'TRAIN':
            return await processTrain(request);
          case 'PREDICT':
            return await processPredict(request);
        }
      } catch (error) {
        return {
          type: 'ERROR',
          message: error instanceof Error ? error.message : 'Unknown worker error',
        };
      }
    });

  return { handleRequest };
};

/**
 * Test-only escape hatch so specs can assert bounded tensor growth without importing tfjs
 * themselves — the bundle-budget grep gate only allows this file to reference `@tensorflow/*`.
 * @expected-unused Only referenced from specs — deliberate leak-detection hook (TICKET-CLEANUP-02).
 */
export const getTensorCount = async (): Promise<number> =>
  (await loadTf()).core.memory().numTensors;

const { handleRequest } = createCategoryModelWorkerHandler((message) => self.postMessage(message));

self.onmessage = ({ data: request }: MessageEvent<WorkerRequest>) => {
  handleRequest(request).then((response) => self.postMessage(response));
};
