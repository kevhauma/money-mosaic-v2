import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import type { AppDataExport } from '@/core/data-access';
import { QrSyncService, parseQrFrame } from '@/core/qr-sync';
import { QrReceiveDialogComponent } from './qr-receive-dialog.component';

type Internals = {
  phase: () => 'starting' | 'scanning' | 'decoding' | 'failed';
  collected: () => number;
  total: () => number | null;
  errorMessage: () => string | null;
  progressLabel: () => string;
  cancel: () => void;
};

type FakeTrack = { stop: ReturnType<typeof vi.fn> };

/** Varied enough that gzip cannot flatten it into a single frame. */
const bigExport = (rows: number): AppDataExport => ({
  schemaVersion: 14,
  exportedAt: '2026-08-27T10:00:00.000Z',
  tables: {
    accounts: [{ id: 1, name: 'Chequing', iban: 'BE68539007547034' }],
    transactions: Array.from({ length: rows }, (_, index) => ({
      id: index,
      accountId: 1,
      date: `2026-0${(index % 9) + 1}-1${index % 10}`,
      amount: Math.round(Math.sin(index) * 100_000) / 100,
      description: `Payment ${index} to counterparty ${(index * 7919) % 5000}`,
    })),
  },
});

const namedError = (name: string): Error => Object.assign(new Error(name), { name });

const WAIT = { timeout: 5000, interval: 20 };

describe('QrReceiveDialogComponent: scanning a transfer', () => {
  let fixture: ComponentFixture<QrReceiveDialogComponent>;
  let tracks: FakeTrack[];
  let getUserMedia: ReturnType<typeof vi.fn>;

  const setMediaDevices = (value: unknown): void => {
    Object.defineProperty(navigator, 'mediaDevices', { value, configurable: true });
  };

  /** Feeds the component's real scanner one queued code per poll, the way a camera would. */
  const queueCodes = (codes: string[]): void => {
    vi.stubGlobal(
      'BarcodeDetector',
      class {
        detect(): Promise<{ rawValue: string }[]> {
          const next = codes.shift();
          return Promise.resolve(next === undefined ? [] : [{ rawValue: next }]);
        }
      },
    );
  };

  const mount = async (): Promise<{
    received: ReturnType<typeof vi.fn>;
    cancelled: ReturnType<typeof vi.fn>;
  }> => {
    // Reset explicitly: one test below mounts the dialog once per failure mode.
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [QrReceiveDialogComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(QrReceiveDialogComponent);
    const received = vi.fn();
    const cancelled = vi.fn();
    fixture.componentInstance.received.subscribe(received);
    fixture.componentInstance.cancelled.subscribe(cancelled);
    fixture.detectChanges();
    await fixture.whenStable();
    return { received, cancelled };
  };

  const internals = (): Internals => fixture.componentInstance as unknown as Internals;

  const allTracksStopped = (): boolean =>
    tracks.every((track) => track.stop.mock.calls.length >= 1);

  beforeEach(() => {
    vi.stubGlobal('isSecureContext', true);
    tracks = [{ stop: vi.fn() }, { stop: vi.fn() }];
    getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => tracks });
    setMediaDevices({ getUserMedia });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setMediaDevices(undefined);
  });

  it('collects frames out of order and repeated, then hands the export up and releases the camera', async () => {
    const data = bigExport(800);
    const frames = await new QrSyncService().encode(data);
    expect(frames.length).toBeGreaterThan(2);

    queueCodes([frames[1], frames[1], ...frames.slice(2).reverse(), frames[0]]);
    const { received } = await mount();

    await vi.waitFor(() => expect(received).toHaveBeenCalledTimes(1), WAIT);

    expect(received.mock.calls[0][0]).toEqual(data);
    expect(internals().collected()).toBe(frames.length);
    expect(internals().total()).toBe(frames.length);
    expect(allTracksStopped()).toBe(true);
  });

  it('ignores frames belonging to a different transfer', async () => {
    const service = new QrSyncService();
    const frames = await service.encode(bigExport(800));
    const stranger = (await service.encode(bigExport(800)))[0];

    queueCodes([frames[0], stranger, 'https://example.com', frames[1]]);
    await mount();

    await vi.waitFor(() => expect(internals().collected()).toBe(2), WAIT);

    expect(internals().total()).toBe(frames.length);
    expect(internals().progressLabel()).toBe(`2 of ${frames.length} codes`);
    expect(parseQrFrame(stranger)?.transferId).not.toBe(parseQrFrame(frames[0])?.transferId);
  });

  it('refuses a corrupted transfer on its checksum, and imports nothing', async () => {
    const frames = await new QrSyncService().encode(bigExport(800));
    const victim = parseQrFrame(frames[1]);
    const corrupted = [
      'MMQR1',
      victim?.transferId,
      1,
      victim?.total,
      victim?.checksum,
      'TAMPERED',
    ].join('|');

    queueCodes(frames.map((frame, index) => (index === 1 ? corrupted : frame)));
    const { received } = await mount();

    await vi.waitFor(() => expect(internals().phase()).toBe('failed'), WAIT);

    expect(received).not.toHaveBeenCalled();
    expect(internals().errorMessage()).toMatch(/checksum/i);
    expect(allTracksStopped()).toBe(true);
  });

  it('releases every camera track when the user cancels', async () => {
    queueCodes([]);
    const { cancelled } = await mount();

    internals().cancel();

    expect(cancelled).toHaveBeenCalledTimes(1);
    expect(allTracksStopped()).toBe(true);
  });

  it('releases every camera track when the component is destroyed', async () => {
    queueCodes([]);
    await mount();

    fixture.destroy();

    expect(allTracksStopped()).toBe(true);
  });

  describe('failures each get their own message, and none leaves the dialog stuck scanning', () => {
    const failureCases = [
      {
        name: 'permission denied',
        arrange: (): void => {
          getUserMedia.mockRejectedValue(namedError('NotAllowedError'));
        },
        expected: /blocked/i,
      },
      {
        name: 'no camera',
        arrange: (): void => {
          getUserMedia.mockRejectedValue(namedError('NotFoundError'));
        },
        expected: /No camera was found/i,
      },
      {
        name: 'insecure context',
        arrange: (): void => {
          vi.stubGlobal('isSecureContext', false);
        },
        expected: /HTTPS or on localhost/i,
      },
    ];

    for (const { name, arrange, expected } of failureCases) {
      it(`reports ${name} with its own message`, async () => {
        queueCodes([]);
        arrange();
        const { received } = await mount();

        await vi.waitFor(() => expect(internals().phase()).toBe('failed'), WAIT);

        expect(internals().errorMessage()).toMatch(expected);
        expect(received).not.toHaveBeenCalled();
      });
    }

    it('never reuses one failure message for another', async () => {
      const messages = new Set<string>();
      for (const { arrange } of failureCases) {
        vi.stubGlobal('isSecureContext', true);
        getUserMedia.mockResolvedValue({ getTracks: () => tracks });
        queueCodes([]);
        arrange();
        await mount();
        await vi.waitFor(() => expect(internals().phase()).toBe('failed'), WAIT);
        messages.add(internals().errorMessage() ?? '');
      }

      expect(messages.size).toBe(failureCases.length);
    });
  });
});
