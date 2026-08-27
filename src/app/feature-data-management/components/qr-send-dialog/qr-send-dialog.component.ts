import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DataManagementRepository, type AppDataExport } from '@/core/data-access';
import {
  QR_FRAME_INTERVAL_MS,
  QR_MAX_FRAMES,
  QrSyncService,
  buildQrSymbol,
  drawQrSymbol,
  type QrSymbol,
} from '@/core/qr-sync';
import {
  AlertComponent,
  ButtonComponent,
  LabelComponent,
  MmModalComponent,
  TypographyComponent,
} from '@/shared/ui';

type SendPhase = 'preparing' | 'ready' | 'sending' | 'too-large' | 'failed';

type ScreenWakeLock = { release(): Promise<void> };
type WakeLockNavigator = Navigator & {
  wakeLock?: { request(type: 'screen'): Promise<ScreenWakeLock> };
};

const formatPassDuration = (milliseconds: number): string => {
  const seconds = Math.max(1, Math.round(milliseconds / 1000));
  if (seconds < 60) return seconds === 1 ? '1 second' : `${seconds} seconds`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder === 0 ? `${minutes} min` : `${minutes} min ${remainder} s`;
};

/**
 * Sending half of the QR transfer (TICKET-DAT-05): exports the database, encodes it into QR frames
 * and blinks them on screen in a loop until the receiving device has caught every one. Mounted by
 * its parent only while open, so a fresh instance prepares its own payload in `ngOnInit`.
 *
 * The export is read once and kept; toggling "include original CSV rows" only re-encodes it, since
 * that choice changes the payload by roughly 4× and is worth letting the user see before starting.
 */
@Component({
  selector: 'app-qr-send-dialog',
  imports: [AlertComponent, ButtonComponent, LabelComponent, MmModalComponent, TypographyComponent],
  templateUrl: './qr-send-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrSendDialogComponent implements OnInit, OnDestroy {
  private readonly dataManagementRepository = inject(DataManagementRepository);
  private readonly qrSync = inject(QrSyncService);

  readonly closed = output<void>();

  protected readonly maxFrames = QR_MAX_FRAMES;
  protected readonly phase = signal<SendPhase>('preparing');
  protected readonly frames = signal<string[]>([]);
  protected readonly frameIndex = signal(0);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly includeRawRows = signal(false);

  protected readonly frameCount = computed(() => this.frames().length);
  protected readonly isAnimated = computed(() => this.frameCount() > 1);
  protected readonly passDuration = computed(() =>
    formatPassDuration(this.frameCount() * QR_FRAME_INTERVAL_MS),
  );
  protected readonly codeNoun = computed(() => (this.frameCount() === 1 ? 'code' : 'codes'));
  protected readonly closeLabel = computed(() => (this.phase() === 'sending' ? 'Done' : 'Close'));
  protected readonly frameNumber = computed(() => this.frameIndex() + 1);
  /** Above the ceiling *because* of the opt-in — there's a cheaper fix than the file export. */
  protected readonly rawRowsPushedItOver = computed(
    () => this.phase() === 'too-large' && this.includeRawRows(),
  );

  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('qrCanvas');

  /** Symbols are built once per frame and reused on every pass — encoding is the expensive part. */
  private readonly symbols = new Map<number, QrSymbol>();
  private exported: AppDataExport | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private wakeLock: ScreenWakeLock | null = null;
  private wakeLockWanted = false;

  constructor() {
    effect(() => {
      const canvas = this.canvas()?.nativeElement;
      const index = this.frameIndex();
      if (canvas && this.frames()[index]) {
        void this.paint(canvas, index);
      }
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      this.exported = await this.dataManagementRepository.exportAll();
    } catch (error) {
      this.fail(error, 'Could not read your data.');
      return;
    }
    await this.buildFrames();
  }

  ngOnDestroy(): void {
    this.stopAnimation();
  }

  protected async setIncludeRawRows(include: boolean): Promise<void> {
    this.includeRawRows.set(include);
    await this.buildFrames();
  }

  protected start(): void {
    this.phase.set('sending');
    void this.holdScreenAwake();
    if (!this.isAnimated()) return;

    this.timer = setInterval(() => {
      this.frameIndex.update((index) => (index + 1) % this.frameCount());
    }, QR_FRAME_INTERVAL_MS);
  }

  protected close(): void {
    this.stopAnimation();
    this.closed.emit();
  }

  private async buildFrames(): Promise<void> {
    const data = this.exported;
    if (!data) return;

    this.phase.set('preparing');
    this.symbols.clear();
    this.frameIndex.set(0);

    try {
      const frames = await this.qrSync.encode(data, { includeRawRows: this.includeRawRows() });
      this.frames.set(frames);
      this.phase.set(frames.length > QR_MAX_FRAMES ? 'too-large' : 'ready');
    } catch (error) {
      this.fail(error, 'Could not prepare the data.');
    }
  }

  private fail(error: unknown, fallback: string): void {
    this.errorMessage.set(error instanceof Error ? error.message : fallback);
    this.phase.set('failed');
  }

  private stopAnimation(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.wakeLockWanted = false;
    void this.wakeLock?.release().catch(() => undefined);
    this.wakeLock = null;
  }

  /** Best-effort only — the Screen Wake Lock API is absent or blocked in plenty of browsers. */
  private async holdScreenAwake(): Promise<void> {
    this.wakeLockWanted = true;
    try {
      const lock = (await (navigator as WakeLockNavigator).wakeLock?.request('screen')) ?? null;
      // The dialog can close while the request is still pending; don't leave the screen pinned on.
      if (this.wakeLockWanted) this.wakeLock = lock;
      else void lock?.release().catch(() => undefined);
    } catch {
      this.wakeLock = null;
    }
  }

  private async paint(canvas: HTMLCanvasElement, index: number): Promise<void> {
    const cached = this.symbols.get(index);
    if (cached) {
      drawQrSymbol(canvas, cached);
      return;
    }

    const frame = this.frames()[index];
    const symbol = await buildQrSymbol(frame);
    this.symbols.set(index, symbol);
    // The loop may have moved on while the encoder was working; only paint what is current.
    if (this.frameIndex() === index) {
      drawQrSymbol(canvas, symbol);
    }
  }
}
