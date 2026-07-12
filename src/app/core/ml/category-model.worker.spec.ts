import type { FeatureConfig } from './model-config';
import { createCategoryModelWorkerHandler, getTensorCount } from './category-model.worker';
import type {
  PredictRequest,
  PredictResponse,
  TrainRequest,
  TrainResponse,
} from './category-model.worker.types';

const featureConfig: FeatureConfig = { dim: 64, charNgramMin: 3, charNgramMax: 4 };

const GROCERY_CATEGORY_ID = 1;
const RENT_CATEGORY_ID = 2;

const groceryDescriptions = [
  'CARREFOUR MARKET BRUSSELS',
  'CARREFOUR EXPRESS GENT',
  'SUPERMARKET DELHAIZE ANTWERP',
  'ALDI DISCOUNT LEUVEN',
];

const rentDescriptions = [
  'RENT PAYMENT LANDLORD SMITH',
  'MONTHLY RENT APARTMENT 4B',
  'LANDLORD TRANSFER JANSSENS',
  'RENT DUE PROPERTY MGMT',
];

const buildSamples = (count: number): TrainRequest['samples'] =>
  Array.from({ length: count }, (_, index) => {
    const isGrocery = index % 2 === 0;
    const pool = isGrocery ? groceryDescriptions : rentDescriptions;
    return {
      rawDescription: `${pool[index % pool.length]} ${index}`,
      counterpartyName: isGrocery ? 'Carrefour' : 'Landlord Co',
      amount: -(10 + index),
      categoryId: isGrocery ? GROCERY_CATEGORY_ID : RENT_CATEGORY_ID,
    };
  });

const asPredictRequest = (samples: TrainRequest['samples']): PredictRequest => ({
  type: 'PREDICT',
  transactions: samples.map((sample, index) => ({
    id: index,
    rawDescription: sample.rawDescription,
    counterpartyName: sample.counterpartyName,
    amount: sample.amount,
  })),
});

const expectedCategoryIds = (samples: TrainRequest['samples']): number[] =>
  samples.map((sample) => sample.categoryId);

describe('category-model.worker: message handling', () => {
  it('replies with an ErrorResponse (not a throw) when PREDICT is called before INIT/TRAIN', async () => {
    const { handleRequest } = createCategoryModelWorkerHandler();

    const response = await handleRequest(asPredictRequest(buildSamples(2)));

    expect(response.type).toBe('ERROR');
    expect((response as { message: string }).message).toMatch(/INIT or TRAIN/);
  });

  it('trains on a small labeled dataset and predicts the correct category for the large majority', async () => {
    const { handleRequest } = createCategoryModelWorkerHandler();
    const samples = buildSamples(30);

    const trainResponse = (await handleRequest({
      type: 'TRAIN',
      samples,
      featureConfig,
    })) as TrainResponse;

    expect(trainResponse.type).toBe('TRAIN_OK');
    expect(trainResponse.metrics.trainedSampleCount).toBe(30);

    const predictResponse = (await handleRequest(asPredictRequest(samples))) as PredictResponse;
    expect(predictResponse.type).toBe('PREDICT_OK');

    const expected = expectedCategoryIds(samples);
    const correct = predictResponse.predictions.filter(
      (prediction, index) => prediction.categoryId === expected[index],
    ).length;

    expect(correct / samples.length).toBeGreaterThanOrEqual(0.8);
  }, 20000);

  it('posts a TRAIN_PROGRESS message per completed epoch, and TRAIN_OK reports epochsRun (ML-15)', async () => {
    const postedProgress: { type: string; epoch: number; totalEpochs: number }[] = [];
    const { handleRequest } = createCategoryModelWorkerHandler((message) =>
      postedProgress.push(message),
    );
    const samples = buildSamples(30);

    const trainResponse = (await handleRequest({
      type: 'TRAIN',
      samples,
      featureConfig,
    })) as TrainResponse;

    expect(postedProgress.length).toBeGreaterThan(0);
    expect(postedProgress[0]).toMatchObject({ type: 'TRAIN_PROGRESS', epoch: 1, totalEpochs: 120 });
    const epochs = postedProgress.map((message) => message.epoch);
    expect(epochs).toEqual([...epochs].sort((a, b) => a - b)); // strictly increasing, in order

    expect(trainResponse.metrics.epochsRun).toBeGreaterThan(0);
    expect(trainResponse.metrics.epochsRun).toBeLessThanOrEqual(120);
    expect(postedProgress.length).toBe(trainResponse.metrics.epochsRun);
  }, 20000);

  it('completes TRAIN with fewer than 40 samples without a validationSplit and without throwing', async () => {
    const { handleRequest } = createCategoryModelWorkerHandler();
    const samples = buildSamples(20);

    const response = await handleRequest({ type: 'TRAIN', samples, featureConfig });

    expect(response.type).toBe('TRAIN_OK');
  }, 20000);

  it('reproduces equivalent predictions after INIT from previously TRAIN-produced artifacts', async () => {
    const trainer = createCategoryModelWorkerHandler();
    const samples = buildSamples(30);

    const trainResponse = (await trainer.handleRequest({
      type: 'TRAIN',
      samples,
      featureConfig,
    })) as TrainResponse;
    const originalPredictions = (
      (await trainer.handleRequest(asPredictRequest(samples))) as PredictResponse
    ).predictions;

    const reloaded = createCategoryModelWorkerHandler();
    const initResponse = await reloaded.handleRequest({
      type: 'INIT',
      artifacts: trainResponse.artifacts,
      featureConfig,
    });
    expect(initResponse.type).toBe('INIT_OK');

    const reloadedPredictions = (
      (await reloaded.handleRequest(asPredictRequest(samples))) as PredictResponse
    ).predictions;

    expect(reloadedPredictions).toEqual(originalPredictions);
  }, 20000);

  it('keeps tensor count bounded across repeated TRAIN/PREDICT calls (no unbounded growth)', async () => {
    const { handleRequest } = createCategoryModelWorkerHandler();
    const samples = buildSamples(20);
    const predictRequest = asPredictRequest(samples);

    await handleRequest({ type: 'TRAIN', samples, featureConfig });
    await handleRequest(predictRequest);
    const afterFirstRound = await getTensorCount();

    await handleRequest({ type: 'TRAIN', samples, featureConfig });
    await handleRequest(predictRequest);
    await handleRequest(predictRequest);
    await handleRequest(predictRequest);
    const afterSeveralMoreRounds = await getTensorCount();

    expect(afterSeveralMoreRounds).toBe(afterFirstRound);
  }, 40000);
});
