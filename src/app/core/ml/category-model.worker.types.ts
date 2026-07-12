import type { FeatureConfig } from './model-config';

export type SerializedArtifacts = {
  modelTopology: ArrayBuffer;
  weightSpecs: ArrayBuffer;
  weightData: ArrayBuffer;
  categoryIdByIndex: number[];
};

export type InitRequest = {
  type: 'INIT';
  artifacts: SerializedArtifacts;
  featureConfig: FeatureConfig;
};

export type TrainRequest = {
  type: 'TRAIN';
  samples: {
    rawDescription: string;
    counterpartyName?: string;
    amount: number;
    categoryId: number;
  }[];
  featureConfig: FeatureConfig;
};

export type PredictRequest = {
  type: 'PREDICT';
  transactions: { id: number; rawDescription: string; counterpartyName?: string; amount: number }[];
};

export type WorkerRequest = InitRequest | TrainRequest | PredictRequest;

export type InitResponse = { type: 'INIT_OK' };

export type TrainResponse = {
  type: 'TRAIN_OK';
  artifacts: SerializedArtifacts;
  /**
   * `epochsRun` is optional because it's absent on artifacts persisted before this field existed —
   * a freshly-completed TRAIN always sets it, but a reloaded old artifact's `metrics` won't have it.
   */
  metrics: { accuracy: number; trainedSampleCount: number; epochsRun?: number };
};

export type PredictResponse = {
  type: 'PREDICT_OK';
  predictions: { id: number; categoryId: number; confidence: number }[];
};

export type ErrorResponse = { type: 'ERROR'; message: string };

export type WorkerResponse = InitResponse | TrainResponse | PredictResponse | ErrorResponse;

/** Posted mid-`TRAIN` from inside `model.fit`'s epoch callback (ML-15) — never a terminal response. */
export type TrainProgress = {
  type: 'TRAIN_PROGRESS';
  epoch: number;
  totalEpochs: number;
  loss: number;
  accuracy: number | null;
  valLoss: number | null;
};

/** Every message shape a worker can post — terminal `WorkerResponse`s plus the non-terminal progress event. */
export type WorkerMessage = WorkerResponse | TrainProgress;
