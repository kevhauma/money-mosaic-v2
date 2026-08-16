import { Injectable } from '@angular/core';
import type { AccentColorId } from '@/core/theme';
import type { CurrencySymbolPosition } from '@/shared/utils';
import { appDb, DEFAULT_APP_SETTINGS, type AppSettings } from './app-db';

@Injectable({ providedIn: 'root' })
export class AppSettingsRepository {
  get = async (): Promise<AppSettings> => (await appDb.appSettings.get(1)) ?? DEFAULT_APP_SETTINGS;

  // Read-merge-put, not `.update()` — unlike `transferSettings`, this table isn't seeded on
  // `populate`, so `.update()` alone would silently no-op for a user with no row yet.
  setPrimaryColor = async (primaryColor: AccentColorId | undefined): Promise<number> => {
    const current = await this.get();
    return appDb.appSettings.put({ ...current, id: 1, primaryColor });
  };

  setCurrencySymbol = async (currencySymbol: string): Promise<number> => {
    const current = await this.get();
    return appDb.appSettings.put({ ...current, id: 1, currencySymbol });
  };

  setCurrencySymbolPosition = async (
    currencySymbolPosition: CurrencySymbolPosition,
  ): Promise<number> => {
    const current = await this.get();
    return appDb.appSettings.put({ ...current, id: 1, currencySymbolPosition });
  };

  setLocale = async (locale: string): Promise<number> => {
    const current = await this.get();
    return appDb.appSettings.put({ ...current, id: 1, locale });
  };

  setExcludedIncomeCategoryIds = async (excludedIncomeCategoryIds: number[]): Promise<number> => {
    const current = await this.get();
    return appDb.appSettings.put({ ...current, id: 1, excludedIncomeCategoryIds });
  };

  // Read-merge-put like every setter here: the row carries a dozen independent fields, so writing
  // one must not clobber the rest (TICKET-STAT-32).
  setHeatmapExcludedCategoryIds = async (heatmapExcludedCategoryIds: number[]): Promise<number> => {
    const current = await this.get();
    return appDb.appSettings.put({ ...current, id: 1, heatmapExcludedCategoryIds });
  };

  // `undefined` clears the setting (TICKET-INC-12) — the Income page falls back to the full data
  // history, which is exactly what an unset field already means.
  setCareerStartDate = async (careerStartDate: string | undefined): Promise<number> => {
    const current = await this.get();
    return appDb.appSettings.put({ ...current, id: 1, careerStartDate });
  };

  setSmoothedBonusCategoryIds = async (smoothedBonusCategoryIds: number[]): Promise<number> => {
    const current = await this.get();
    return appDb.appSettings.put({ ...current, id: 1, smoothedBonusCategoryIds });
  };

  // `undefined` clears the setting (TICKET-SET-08) — the Income page's gross series fall back to
  // the active theme's categorical palette, which is what an unset field already means.
  setGrossColor = async (grossColor: AccentColorId | undefined): Promise<number> => {
    const current = await this.get();
    return appDb.appSettings.put({ ...current, id: 1, grossColor });
  };

  // `undefined` clears the setting (TICKET-INC-19) — an embedded bonus falls back to coming off
  // every non-zero income series pro rata, which is what an unset field already means.
  setMainIncomeCategoryId = async (mainIncomeCategoryId: number | undefined): Promise<number> => {
    const current = await this.get();
    return appDb.appSettings.put({ ...current, id: 1, mainIncomeCategoryId });
  };

  setPrivacyMode = async (privacyMode: boolean): Promise<number> => {
    const current = await this.get();
    return appDb.appSettings.put({ ...current, id: 1, privacyMode });
  };

  // No `undefined` variant (TICKET-SET-09) — the section always writes a concrete 1–12, including
  // January, so a deliberate January is recorded rather than indistinguishable from never having
  // written the field.
  setFiscalYearStartMonth = async (fiscalYearStartMonth: number): Promise<number> => {
    const current = await this.get();
    return appDb.appSettings.put({ ...current, id: 1, fiscalYearStartMonth });
  };

  /**
   * Records that a guide's first-visit intro has been shown (TICKET-PUB-08). Idempotent — marking
   * the same slug twice leaves one entry, because both of the intro's exits call this and a user
   * who reaches the page by two paths shouldn't accumulate duplicates.
   */
  markGuideSeen = async (slug: string): Promise<number> => {
    const current = await this.get();
    const seenGuideSlugs = current.seenGuideSlugs ?? [];
    if (seenGuideSlugs.includes(slug)) return 1;
    return appDb.appSettings.put({ ...current, id: 1, seenGuideSlugs: [...seenGuideSlugs, slug] });
  };
}
