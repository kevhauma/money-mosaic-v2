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
  metrics: { accuracy: number; trainedSampleCount: number };
};

export type PredictResponse = {
  type: 'PREDICT_OK';
  predictions: { id: number; categoryId: number; confidence: number }[];
};

export type ErrorResponse = { type: 'ERROR'; message: string };

export type WorkerResponse = InitResponse | TrainResponse | PredictResponse | ErrorResponse;
