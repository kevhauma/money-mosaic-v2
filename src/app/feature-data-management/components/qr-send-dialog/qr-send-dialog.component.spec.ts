import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { DataManagementRepository, type AppDataExport } from '@/core/data-access';
import { QR_FRAME_INTERVAL_MS, QR_MAX_FRAMES, QrSyncService } from '@/core/qr-sync';
import { QrSendDialogComponent } from './qr-send-dialog.component';

type Internals = {
  phase: () => 'preparing' | 'ready' | 'sending' | 'too-large' | 'failed';
  includeRawRows: () => boolean;
  rawRowsPushedItOver: () => boolean;
  setIncludeRawRows: (include: boolean) => Promise<void>;
  frameCount: () => number;
  frameIndex: () => number;
  isAnimated: () => boolean;
  passDuration: () => string;
  errorMessage: () => string | null;
  start: () => void;
  close: () => void;
};

const backup: AppDataExport = {
  schemaVersion: 14,
  exportedAt: '2026-08-27T10:00:00.000Z',
  tables: { accounts: [] },
};

const syntheticFrames = (count: number): string[] =>
  Array.from({ length: count }, (_, index) => `MMQR2|abcdef01|${index}|${count}|9a3c1e07|chunk`);

describe('QrSendDialogComponent: preparing and showing a transfer', () => {
  let fixture: ComponentFixture<QrSendDialogComponent>;

  const dataManagementRepository = { exportAll: vi.fn().mockResolvedValue(backup) };
  const qrSync = { encode: vi.fn(), decode: vi.fn() };

  const setup = async (frames: string[]): Promise<void> => {
    vi.clearAllMocks();
    dataManagementRepository.exportAll.mockResolvedValue(backup);
    qrSync.encode.mockResolvedValue(frames);

    await TestBed.configureTestingModule({
      imports: [QrSendDialogComponent],
      providers: [
        { provide: DataManagementRepository, useValue: dataManagementRepository },
        { provide: QrSyncService, useValue: qrSync },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(QrSendDialogComponent);
    await fixture.whenStable();
    // `ngOnInit` resolves its export off the microtask queue, after the first stable pass.
    fixture.detectChanges();
  };

  const internals = (): Internals => fixture.componentInstance as unknown as Internals;

  /**
   * Angular's own zoneless scheduler also uses `setInterval`, so a bare spy on the global sees
   * frames of change detection too — only the calls at the sender's own cadence are the loop.
   */
  const animationTicks = (spy: { mock: { calls: unknown[][] } }): unknown[][] =>
    spy.mock.calls.filter((call) => call[1] === QR_FRAME_INTERVAL_MS);

  it('reports the frame count and an estimated pass time before anything animates', async () => {
    await setup(syntheticFrames(60));

    expect(internals().phase()).toBe('ready');
    expect(internals().frameCount()).toBe(60);
    expect(internals().passDuration()).toBe('8 seconds');
    expect(fixture.nativeElement.textContent).toContain('60 codes');
    expect(fixture.nativeElement.textContent).toContain('8 seconds');
    expect(fixture.nativeElement.querySelector('canvas')).toBeNull();
  });

  it('refuses a payload above the frame ceiling and points at the file export instead', async () => {
    const setInterval = vi.spyOn(globalThis, 'setInterval');
    await setup(syntheticFrames(QR_MAX_FRAMES + 1));

    expect(internals().phase()).toBe('too-large');
    expect(fixture.nativeElement.textContent).toContain(`${QR_MAX_FRAMES + 1} codes`);
    expect(fixture.nativeElement.textContent).toContain('Export data');
    expect(animationTicks(setInterval)).toHaveLength(0);
    setInterval.mockRestore();
  });

  it('renders a single-frame payload as a static code, with no animation loop', async () => {
    await setup(syntheticFrames(1));
    const setInterval = vi.spyOn(globalThis, 'setInterval');

    internals().start();
    await fixture.whenStable();

    expect(internals().phase()).toBe('sending');
    expect(internals().isAnimated()).toBe(false);
    expect(animationTicks(setInterval)).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain('One code holds everything');
    setInterval.mockRestore();
  });

  it('cycles the frames on a loop that wraps back to the first', async () => {
    await setup(syntheticFrames(3));
    const setInterval = vi.spyOn(globalThis, 'setInterval');

    internals().start();
    const ticks = animationTicks(setInterval);
    const tick = ticks[0][0] as () => void;

    expect(ticks).toHaveLength(1);
    tick();
    expect(internals().frameIndex()).toBe(1);
    tick();
    tick();
    expect(internals().frameIndex()).toBe(0);
    setInterval.mockRestore();
  });

  it('stops the loop and reports itself closed when dismissed', async () => {
    await setup(syntheticFrames(3));
    const clearInterval = vi.spyOn(globalThis, 'clearInterval');
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);

    internals().start();
    internals().close();

    expect(clearInterval).toHaveBeenCalled();
    expect(closed).toHaveBeenCalledTimes(1);
    clearInterval.mockRestore();
  });

  it('leaves the source CSV rows out by default, and re-encodes when they are asked for', async () => {
    await setup(syntheticFrames(60));
    qrSync.encode.mockResolvedValue(syntheticFrames(240));

    expect(internals().includeRawRows()).toBe(false);
    expect(qrSync.encode).toHaveBeenCalledWith(backup, { includeRawRows: false });

    await internals().setIncludeRawRows(true);
    fixture.detectChanges();

    expect(qrSync.encode).toHaveBeenLastCalledWith(backup, { includeRawRows: true });
    // Re-encoded from the export already in hand — the database is read exactly once.
    expect(dataManagementRepository.exportAll).toHaveBeenCalledTimes(1);
    expect(internals().frameCount()).toBe(240);
    expect(internals().phase()).toBe('ready');
  });

  it('points at the toggle, not the file export, when the raw rows are what broke the ceiling', async () => {
    await setup(syntheticFrames(60));
    qrSync.encode.mockResolvedValue(syntheticFrames(QR_MAX_FRAMES + 1));

    await internals().setIncludeRawRows(true);
    fixture.detectChanges();

    expect(internals().phase()).toBe('too-large');
    expect(internals().rawRowsPushedItOver()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Turn off the original CSV rows');
  });

  it('surfaces an export failure instead of showing an empty code', async () => {
    vi.clearAllMocks();
    dataManagementRepository.exportAll.mockRejectedValue(new Error('Database is locked.'));
    await TestBed.configureTestingModule({
      imports: [QrSendDialogComponent],
      providers: [
        { provide: DataManagementRepository, useValue: dataManagementRepository },
        { provide: QrSyncService, useValue: qrSync },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(QrSendDialogComponent);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(internals().phase()).toBe('failed');
    expect(internals().errorMessage()).toBe('Database is locked.');
  });
});
