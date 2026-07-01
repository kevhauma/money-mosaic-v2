import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import type { Account } from '@/core/data-access';

@Component({
  selector: 'app-import-select-step',
  imports: [],
  templateUrl: './import-select-step.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportSelectStepComponent {
  readonly accounts = input.required<Account[]>();
  readonly accountId = model<number | null>(null);
  readonly file = model<File | null>(null);

  protected onAccountChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.accountId.set(value ? Number(value) : null);
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.file.set(input.files?.[0] ?? null);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    const dropped = event.dataTransfer?.files?.[0];
    if (dropped) this.file.set(dropped);
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
  }
}
