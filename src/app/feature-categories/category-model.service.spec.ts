import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ErrorResponse,
  InitResponse,
  PredictResponse,
  SerializedArtifacts,
  TrainResponse,
  WorkerRequest,
  WorkerResponse,
} from '@/core/ml';
import { CategoryModelService } from './category-model.service';

type Listener<E> = (event: E) => void;

class FakeWorker {
  static instances: FakeWorker[] = [];

  postedMessages: WorkerRequest[] = [];
  terminated = false;
  private messageListeners: Listener<MessageEvent<WorkerResponse>>[] = [];
  private errorListeners: Listener<ErrorEvent>[] = [];

  constructor(public readonly url: URL | string) {
    FakeWorker.instances.push(this);
  }

  addEventListener(
    type: 'message' | 'error',
    listener: Listener<MessageEvent<WorkerResponse>> | Listener<ErrorEvent>,
  ): void {
    if (type === 'message') {
      this.messageListeners.push(listener as Listener<MessageEvent<WorkerResponse>>);
    } else {
      this.errorListeners.push(listener as Listener<ErrorEvent>);
    }
  }

  removeEventListener(
    type: 'message' | 'error',
    listener: Listener<MessageEvent<WorkerResponse>> | Listener<ErrorEvent>,
  ): void {
    if (type === 'message') {
      this.messageListeners = this.messageListeners.filter((l) => l !== listener);
    } else {
      this.errorListeners = this.errorListeners.filter((l) => l !== listener);
    }
  }

  postMessage(data: WorkerRequest): void {
    this.postedMessages.push(data);
  }

  terminate(): void {
    this.terminated = true;
  }

  emitMessage(data: WorkerResponse): void {
    this.messageListeners.slice().forEach((listener) => listener({ data } as MessageEvent));
  }

  emitError(message: string): void {
    this.errorListeners.slice().forEach((listener) => listener({ message } as ErrorEvent));
  }
}

const artifacts: SerializedArtifacts = {
  modelTopology: new ArrayBuffer(0),
  weightSpecs: new ArrayBuffer(0),
  weightData: new ArrayBuffer(0),
  categoryIdByIndex: [1, 2],
};
const featureConfig = { hashDimensions: 64 } as never;

// The service chains every request onto an internal queue Promise, so `postMessage`/listener
// registration happens a microtask after the call returns — flush before emitting/asserting.
const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('CategoryModelService: worker ownership', () => {
  let service: CategoryModelService;
  let worker: FakeWorker;

  beforeEach(() => {
    FakeWorker.instances = [];
    vi.stubGlobal('Worker', FakeWorker);
    TestBed.configureTestingModule({});
    service = TestBed.inject(CategoryModelService);
    worker = FakeWorker.instances[0];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('constructs exactly one worker for the service, reused across every call', async () => {
    const initPromise = service.init(artifacts, featureConfig);
    await flushMicrotasks();
    worker.emitMessage({ type: 'INIT_OK' } satisfies InitResponse);
    await initPromise;

    const predictPromise = service.predict([]);
    await flushMicrotasks();
    worker.emitMessage({ type: 'PREDICT_OK', predictions: [] } satisfies PredictResponse);
    await predictPromise;

    expect(FakeWorker.instances).toHaveLength(1);
  });
});

describe('CategoryModelService: init/train/predict request-response matching', () => {
  let service: CategoryModelService;
  let worker: FakeWorker;

  beforeEach(() => {
    FakeWorker.instances = [];
    vi.stubGlobal('Worker', FakeWorker);
    TestBed.configureTestingModule({});
    service = TestBed.inject(CategoryModelService);
    worker = FakeWorker.instances[0];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves init() when the worker replies INIT_OK', async () => {
    const promise = service.init(artifacts, featureConfig);
    await flushMicrotasks();
    expect(worker.postedMessages).toEqual([{ type: 'INIT', artifacts, featureConfig }]);

    worker.emitMessage({ type: 'INIT_OK' } satisfies InitResponse);
    await expect(promise).resolves.toBeUndefined();
  });

  it('resolves train() with the TRAIN_OK response payload', async () => {
    const samples = [{ rawDescription: 'coffee', amount: -3.5, categoryId: 7 }];
    const promise = service.train(samples, featureConfig);
    await flushMicrotasks();

    const trainResponse: TrainResponse = {
      type: 'TRAIN_OK',
      artifacts,
      metrics: { accuracy: 0.9, trainedSampleCount: 1 },
    };
    worker.emitMessage(trainResponse);

    await expect(promise).resolves.toEqual(trainResponse);
  });

  it('resolves predict() with the predictions array from PREDICT_OK', async () => {
    const transactions = [{ id: 1, rawDescription: 'coffee', amount: -3.5 }];
    const promise = service.predict(transactions);
    await flushMicrotasks();

    worker.emitMessage({
      type: 'PREDICT_OK',
      predictions: [{ id: 1, categoryId: 7, confidence: 0.8 }],
    } satisfies PredictResponse);

    await expect(promise).resolves.toEqual([{ id: 1, categoryId: 7, confidence: 0.8 }]);
  });
});

describe('CategoryModelService: error propagation', () => {
  let service: CategoryModelService;
  let worker: FakeWorker;

  beforeEach(() => {
    FakeWorker.instances = [];
    vi.stubGlobal('Worker', FakeWorker);
    TestBed.configureTestingModule({});
    service = TestBed.inject(CategoryModelService);
    worker = FakeWorker.instances[0];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects with a real Error when the worker replies with an ErrorResponse', async () => {
    const promise = service.train([], featureConfig);
    await flushMicrotasks();
    worker.emitMessage({ type: 'ERROR', message: 'training failed' } satisfies ErrorResponse);

    await expect(promise).rejects.toThrow('training failed');
  });

  it('rejects with a real Error when the worker fires a top-level error event', async () => {
    const promise = service.predict([]);
    await flushMicrotasks();
    worker.emitError('worker crashed');

    await expect(promise).rejects.toThrow('worker crashed');
  });

  it('does not block later queued calls after an earlier call rejects', async () => {
    const failedPromise = service.train([], featureConfig);
    await flushMicrotasks();
    worker.emitMessage({ type: 'ERROR', message: 'boom' } satisfies ErrorResponse);
    await expect(failedPromise).rejects.toThrow('boom');

    const nextPromise = service.init(artifacts, featureConfig);
    await flushMicrotasks();
    worker.emitMessage({ type: 'INIT_OK' } satisfies InitResponse);

    await expect(nextPromise).resolves.toBeUndefined();
  });
});

describe('CategoryModelService: sequencing concurrent calls', () => {
  let service: CategoryModelService;
  let worker: FakeWorker;

  beforeEach(() => {
    FakeWorker.instances = [];
    vi.stubGlobal('Worker', FakeWorker);
    TestBed.configureTestingModule({});
    service = TestBed.inject(CategoryModelService);
    worker = FakeWorker.instances[0];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts predict() only after train()'s response has arrived, without interleaving", async () => {
    const trainPromise = service.train([], featureConfig);
    const predictPromise = service.predict([]);

    await flushMicrotasks();
    expect(worker.postedMessages).toHaveLength(1);
    expect(worker.postedMessages[0].type).toBe('TRAIN');

    worker.emitMessage({
      type: 'TRAIN_OK',
      artifacts,
      metrics: { accuracy: 1, trainedSampleCount: 0 },
    } satisfies TrainResponse);
    await trainPromise;
    await flushMicrotasks();

    expect(worker.postedMessages).toHaveLength(2);
    expect(worker.postedMessages[1].type).toBe('PREDICT');

    worker.emitMessage({ type: 'PREDICT_OK', predictions: [] } satisfies PredictResponse);
    await expect(predictPromise).resolves.toEqual([]);
  });
});
