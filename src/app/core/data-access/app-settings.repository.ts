import { inject, Injectable } from '@angular/core';
import type { AccentColorId } from '@/core/theme';
import type { CurrencySymbolPosition } from '@/shared/utils';
import { ApiClient } from './api-client';
import type { AppSettings, RecentRange } from './entities';
import { DEFAULT_APP_SETTINGS } from './seed-data';

const PATH = '/settings/appSettings';

/**
 * The fourteen setters survive the move to the server unchanged in signature, and each is now a
 * one-field `PATCH` instead of a read-merge-put (TICKET-SRV-05). Two consequences worth naming:
 *
 * - **The merge is the server's job**, inside a transaction, so two tabs setting two different
 *   fields at the same moment can no longer lose one of them.
 * - **A setter given `undefined` still clears its field.** `ApiClient` puts an explicitly-`undefined`
 *   value on the wire as `null` — `JSON.stringify` would drop it, turning "clear this" into a patch
 *   that names no field at all. That is Dexie's `update` semantics kept, not a new convention.
 *
 * See `transfer-settings.repository.ts` for why `get` spreads the response over the `DEFAULT_*`.
 */
@Injectable({ providedIn: 'root' })
export class AppSettingsRepository {
  private readonly api = inject(ApiClient);

  get = (): Promise<AppSettings> =>
    this.api
      .get<Partial<AppSettings>>(PATH)
      .then((settings) => ({ ...DEFAULT_APP_SETTINGS, ...settings }));

  setPrimaryColor = (primaryColor: AccentColorId | undefined): Promise<number> =>
    this.patch({ primaryColor });

  setCurrencySymbol = (currencySymbol: string): Promise<number> => this.patch({ currencySymbol });

  setCurrencySymbolPosition = (currencySymbolPosition: CurrencySymbolPosition): Promise<number> =>
    this.patch({ currencySymbolPosition });

  setLocale = (locale: string): Promise<number> => this.patch({ locale });

  setExcludedIncomeCategoryIds = (excludedIncomeCategoryIds: number[]): Promise<number> =>
    this.patch({ excludedIncomeCategoryIds });

  setHeatmapExcludedCategoryIds = (heatmapExcludedCategoryIds: number[]): Promise<number> =>
    this.patch({ heatmapExcludedCategoryIds });

  // `undefined` clears the setting (TICKET-INC-12) — the Income page falls back to the full data
  // history, which is exactly what an unset field already means.
  setCareerStartDate = (careerStartDate: string | undefined): Promise<number> =>
    this.patch({ careerStartDate });

  setSmoothedBonusCategoryIds = (smoothedBonusCategoryIds: number[]): Promise<number> =>
    this.patch({ smoothedBonusCategoryIds });

  // `undefined` clears the setting (TICKET-SET-08) — the Income page's gross series fall back to
  // the active theme's categorical palette, which is what an unset field already means.
  setGrossColor = (grossColor: AccentColorId | undefined): Promise<number> =>
    this.patch({ grossColor });

  // `undefined` clears the setting (TICKET-INC-19) — an embedded bonus falls back to coming off
  // every non-zero income series pro rata, which is what an unset field already means.
  setMainIncomeCategoryId = (mainIncomeCategoryId: number | undefined): Promise<number> =>
    this.patch({ mainIncomeCategoryId });

  setPrivacyMode = (privacyMode: boolean): Promise<number> => this.patch({ privacyMode });

  // No `undefined` variant (TICKET-SET-09) — the section always writes a concrete 1–12, including
  // January, so a deliberate January is recorded rather than indistinguishable from never having
  // written the field.
  setFiscalYearStartMonth = (fiscalYearStartMonth: number): Promise<number> =>
    this.patch({ fiscalYearStartMonth });

  // The dedup/cap/move-to-top logic lives one layer up in `AppSettingsStore.recordRecentRange`
  // (TICKET-STAT-40) — this just persists whatever list it is given.
  setRecentRanges = (recentRanges: RecentRange[]): Promise<number> => this.patch({ recentRanges });

  /**
   * The one request every setter above makes. Declared with modifiers so it stays private: fourteen
   * copies of the same `.patch(...).then(() => 1)` would be fourteen chances to send the wrong path.
   */
  private patch(changes: Partial<AppSettings>): Promise<number> {
    return this.api.patch<AppSettings>(PATH, changes).then(() => 1);
  }
}
