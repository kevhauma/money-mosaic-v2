import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  QrCameraError,
  QrCameraScanner,
  QrFrameCollector,
  QrSyncService,
  type QrScannerFailure,
  type QrTransferResult,
} from '@/core/qr-sync';
import {
  AlertComponent,
  ButtonComponent,
  MmModalComponent,
  TypographyComponent,
} from '@/shared/ui';

type ReceivePhase = 'starting' | 'scanning' | 'decoding' | 'failed';

/**
 * Receiving half of the QR transfer (TICKET-DAT-05): watches the camera for frames until the whole
 * payload is in hand, then hands the decoded export up to the parent, which runs it through the
 * same Replace-vs-Merge confirmation the file import uses. This component never imports anything
 * itself — a checksum failure stops here and no write is attempted.
 */
@Component({
  selector: 'app-qr-receive-dialog',
  imports: [AlertComponent, ButtonComponent, MmModalComponent, TypographyComponent],
  templateUrl: './qr-receive-dialog.component.html',
  providers: [QrCameraScanner],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrReceiveDialogComponent implements AfterViewInit, OnDestroy {
  private readonly qrSync = inject(QrSyncService);
  private readonly scanner = inject(QrCameraScanner);

  readonly received = output<QrTransferResult>();
  readonly cancelled = output<void>();

  protected readonly phase = signal<ReceivePhase>('starting');
  protected readonly collected = signal(0);
  protected readonly total = signal<number | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  private readonly failureReason = signal<QrScannerFailure | null>(null);

  protected readonly failed = computed(() => this.phase() === 'failed');
  /** The two failures no retry can fix — say where to go instead of leaving a dead end. */
  protected readonly suggestFileImport = computed(
    () => this.failureReason() === 'no-camera' || this.failureReason() === 'insecure-context',
  );

  protected readonly progressLabel = computed(() => {
    const total = this.total();
    if (total === null) return 'Looking for a code…';
    return `${this.collected()} of ${total} codes`;
  });

  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('preview');
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('frameBuffer');

  private readonly collector = new QrFrameCollector();

  async ngAfterViewInit(): Promise<void> {
    try {
      await this.scanner.start(this.video().nativeElement, this.canvas().nativeElement, (text) =>
        this.onFrame(text),
      );
      if (this.phase() === 'starting') this.phase.set('scanning');
    } catch (error) {
      this.fail(
        error instanceof Error ? error.message : 'The camera could not be started.',
        error instanceof QrCameraError ? error.reason : null,
      );
    }
  }

  ngOnDestroy(): void {
    this.scanner.stop();
  }

  protected cancel(): void {
    this.scanner.stop();
    this.cancelled.emit();
  }

  private onFrame(text: string): void {
    if (!this.collector.accept(text)) return;

    this.collected.set(this.collector.collected);
    this.total.set(this.collector.total);
    if (this.collector.isComplete) {
      void this.finish();
    }
  }

  private async finish(): Promise<void> {
    if (this.phase() === 'decoding') return;
    this.phase.set('decoding');
    // Release the camera before decoding: the payload is complete, so nothing more is scanned
    // either way, and leaving the light on while gunzipping reads as a stuck scan.
    this.scanner.stop();

    try {
      this.received.emit(await this.qrSync.decode(this.collector.snapshot()));
    } catch (error) {
      this.fail(error instanceof Error ? error.message : 'The scanned data could not be read.');
    }
  }

  private fail(message: string, reason: QrScannerFailure | null = null): void {
    this.scanner.stop();
    this.errorMessage.set(message);
    this.failureReason.set(reason);
    this.phase.set('failed');
  }
}
