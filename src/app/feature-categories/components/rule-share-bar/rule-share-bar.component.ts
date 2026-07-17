import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerDownload, tablerUpload } from '@ng-icons/tabler-icons';
import { AlertComponent, ButtonComponent, FlexComponent } from '@/shared/ui';
import { downloadJson } from '@/shared/utils';
import { RulesStore, type ImportRulesResult } from '../../rules.store';
import type { SharedRulesFile } from '../../rule-share';

const todayIso = (): string => new Date().toISOString().slice(0, 10);

/** Export/import toolbar for the rules page (TICKET-CAT-06) — owns its own share state so the parent table stays focused on selection and row actions. */
@Component({
  selector: 'app-rule-share-bar',
  imports: [NgIcon, AlertComponent, ButtonComponent, FlexComponent],
  templateUrl: './rule-share-bar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerDownload, tablerUpload })],
})
export class RuleShareBarComponent {
  private readonly rulesStore = inject(RulesStore);

  /** Ids of the rules currently selected in the parent table — drives "Export selected". */
  readonly selectedIds = input<number[]>([]);

  protected readonly shareError = signal<string | null>(null);
  protected readonly importSummary = signal<ImportRulesResult | null>(null);
  protected readonly importing = signal(false);

  protected exportAllRules(): void {
    this.shareError.set(null);
    downloadJson(this.rulesStore.exportRules(), `money-mosaic-rules-${todayIso()}.json`);
  }

  protected exportSelectedRules(): void {
    this.shareError.set(null);
    downloadJson(
      this.rulesStore.exportRules(this.selectedIds()),
      `money-mosaic-rules-${todayIso()}.json`,
    );
  }

  protected async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;

    this.shareError.set(null);
    this.importSummary.set(null);

    let parsed: SharedRulesFile;
    try {
      parsed = JSON.parse(await file.text()) as SharedRulesFile;
    } catch {
      this.shareError.set(
        'Could not read this file — it is not a valid Money Mosaic rules export.',
      );
      return;
    }

    this.importing.set(true);
    try {
      this.importSummary.set(await this.rulesStore.importRules(parsed));
    } catch (error) {
      this.shareError.set(
        error instanceof Error ? error.message : 'Could not import this rules file.',
      );
    } finally {
      this.importing.set(false);
    }
  }

  protected skippedReasonsText(summary: ImportRulesResult): string {
    return summary.skipped.map((entry) => entry.reason).join(', ');
  }
}
