import { Injectable } from '@angular/core';
import type {
  FeatureConfig,
  InitResponse,
  PredictRequest,
  PredictResponse,
  SerializedArtifacts,
  TrainProgress,
  TrainRequest,
  TrainResponse,
  WorkerMessage,
  WorkerRequest,
  WorkerResponse,
} from '@/core/ml';

/**
 * Sole owner of ML-05's long-lived category-model worker: constructs it once and exposes
 * init/train/predict as sequenced, Promise-wrapped round-trips so a call in flight is never
 * interleaved with the next one's worker messages.
 */
@Injectable({ providedIn: 'root' })
export class CategoryModelService {
  private readonly worker = new Worker(
    new URL('../core/ml/category-model.worker', import.meta.url),
  );
  private queue: Promise<unknown> = Promise.resolve();

  init = (artifacts: SerializedArtifacts, featureConfig: FeatureConfig): Promise<void> =>
    this.sendRequest<InitResponse>({ type: 'INIT', artifacts, featureConfig }).then(
      () => undefined,
    );

  train = (
    samples: TrainRequest['samples'],
    featureConfig: FeatureConfig,
    onProgress?: (progress: Omit<TrainProgress, 'type'>) => void,
  ): Promise<TrainResponse> =>
    this.sendRequest<TrainResponse>({ type: 'TRAIN', samples, featureConfig }, onProgress);

  predict = (
    transactions: PredictRequest['transactions'],
  ): Promise<PredictResponse['predictions']> =>
    this.sendRequest<PredictResponse>({ type: 'PREDICT', transactions }).then(
      (response) => response.predictions,
    );

  private sendRequest<TResponse extends WorkerResponse>(
    request: WorkerRequest,
    onProgress?: (progress: Omit<TrainProgress, 'type'>) => void,
  ): Promise<Exclude<TResponse, { type: 'ERROR' }>> {
    const response = this.queue.then(
      () =>
        new Promise<Exclude<TResponse, { type: 'ERROR' }>>((resolve, reject) => {
          const cleanup = () => {
            this.worker.removeEventListener('message', handleMessage);
            this.worker.removeEventListener('error', handleError);
          };
          const handleMessage = (event: MessageEvent<WorkerMessage>) => {
            if (event.data.type === 'TRAIN_PROGRESS') {
              // Non-terminal — more messages (eventually a terminal one) are still coming for this
              // request, so the listeners stay attached.
              const { epoch, totalEpochs, loss, accuracy, valLoss } = event.data;
              onProgress?.({ epoch, totalEpochs, loss, accuracy, valLoss });
              return;
            }
            cleanup();
            if (event.data.type === 'ERROR') {
              reject(new Error(event.data.message));
              return;
            }
            resolve(event.data as Exclude<TResponse, { type: 'ERROR' }>);
          };
          const handleError = (event: ErrorEvent) => {
            cleanup();
            reject(new Error(event.message));
          };
          this.worker.addEventListener('message', handleMessage);
          this.worker.addEventListener('error', handleError);
          this.worker.postMessage(request);
        }),
    );
    // Swallow rejection on the chained queue itself so one failed call doesn't
    // permanently block requests queued after it.
    this.queue = response.then(
      () => undefined,
      () => undefined,
    );
    return response;
  }
}
