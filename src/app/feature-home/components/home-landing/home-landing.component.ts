import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  tablerBulb,
  tablerChartBar,
  tablerCoin,
  tablerFileImport,
  tablerMapPin,
  tablerShieldLock,
  tablerTags,
  tablerUsers,
} from '@ng-icons/tabler-icons';
import { ButtonComponent, FlexComponent, PaperComponent, TypographyComponent } from '@/shared/ui';

type ValueProp = {
  readonly icon: string;
  readonly title: string;
  readonly description: string;
};

type ProcessStep = {
  readonly icon: string;
  readonly title: string;
  readonly description: string;
};

type FeatureGroup = {
  readonly title: string;
  readonly items: readonly string[];
};

/**
 * The positioning pitch — why this app over the sync-everything, subscription-priced competitors
 * (see docs/v9999_ideas/competitive-analysis.md for the sourcing behind each claim). Kept
 * competitor-name-free on the live page; the comparisons live in the internal analysis doc.
 */
const VALUE_PROPS: readonly ValueProp[] = [
  {
    icon: 'tablerShieldLock',
    title: 'Nothing to breach, because nothing leaves your device',
    description:
      "Your transactions live in your browser's own database. There's no server to hack, no company to get acquired, no shutdown that takes your history down with it.",
  },
  {
    icon: 'tablerCoin',
    title: 'Free, with no catch',
    description:
      'No subscription, no premium tier gating features behind a paywall. Everything on this page is included — for every user, forever.',
  },
  {
    icon: 'tablerMapPin',
    title: 'Actually built for European banks',
    description:
      'KBC and Belfius CSV presets, IBAN-based transfer matching, EUR formatting — not a US-first product with EU support bolted on afterward.',
  },
  {
    icon: 'tablerUsers',
    title: 'Joint accounts, done properly',
    description:
      "Tracks what you actually contributed to a shared account, not a flat share of the balance — so a partner's spending never inflates your net worth.",
  },
  {
    icon: 'tablerBulb',
    title: 'Categorisation you can see and correct',
    description:
      'A rules engine you can read and edit, plus an on-device learning model that only ever suggests. Never a black box, never an override of a category you set yourself.',
  },
];

const PROCESS_STEPS: readonly ProcessStep[] = [
  {
    icon: 'tablerFileImport',
    title: 'Import',
    description:
      'Export a CSV from your bank and drop it in. Money Mosaic recognises common formats automatically, or walks you through mapping a new one.',
  },
  {
    icon: 'tablerTags',
    title: 'Categorise',
    description:
      'Rules and an on-device model sort transactions into categories automatically, and quietly get smarter every time you correct one.',
  },
  {
    icon: 'tablerChartBar',
    title: 'Understand',
    description:
      'Net worth, spending, transfers, and trends, all on one dashboard that updates instantly as you add data.',
  },
];

/**
 * The full feature surface, grouped the way the app itself is organised (import → categorise →
 * transactions → transfers → joint accounts → dashboard → data), so a first-time visitor gets a
 * genuinely complete picture rather than a marketing summary. Sits below the positioning pitch
 * (`VALUE_PROPS`) as the "everything included" detail section for a visitor who wants specifics.
 */
const FEATURE_GROUPS: readonly FeatureGroup[] = [
  {
    title: 'Import your bank statements',
    items: [
      'Import CSV exports from your bank, with automatic format detection for supported banks',
      "A guided mapping wizard handles any bank whose format isn't recognised yet, with a live preview before anything is committed",
      'Column mappings are saved as reusable profiles, so re-importing from the same bank never asks twice',
      'Duplicate rows are skipped automatically on re-import via a fingerprint match, and a failed import leaves your existing data untouched',
      'Large files are parsed in a background worker, so the app stays responsive',
    ],
  },
  {
    title: 'Categorise automatically',
    items: [
      'A rules engine assigns categories on import based on conditions you define — merchant, description, amount, account — with AND/OR logic and priority ordering',
      'A one-click "always categorise this merchant as X" shortcut turns any transaction into a rule',
      'An in-browser machine-learning model, trained only on your own history, suggests categories for anything the rules miss, and proposes new rules from the patterns it finds',
      'A category you set manually is never overwritten by a rule or a suggestion',
      'Uncategorised transactions are always easy to find',
    ],
  },
  {
    title: 'Manage every transaction',
    items: [
      'One place for every transaction across every account, searchable and filterable by account, date range, category, text, or amount',
      'Bulk-assign a category to many selected transactions at once',
      'A fast, virtualized table stays smooth even with years of history',
    ],
  },
  {
    title: 'Link transfers between your own accounts',
    items: [
      'Money moving between your own accounts is detected automatically, excluded from income/expense, and still counted toward net worth',
      'High-confidence matches (same IBAN) link instantly; ambiguous ones wait for your confirmation',
      'The matching window and confidence behaviour are configurable in settings',
    ],
  },
  {
    title: 'Handle joint and shared accounts',
    items: [
      'Track your real contribution to a joint account — what you actually put in — rather than a flat share of its balance',
      "Register each co-owner's IBAN so their deposits are recognised and kept out of your own income",
      'A dedicated "neutral" category kind keeps partner contributions from skewing your stats',
    ],
  },
  {
    title: 'See the whole picture on your dashboard',
    items: [
      'Net worth, income, expenses, and savings rate for any date range, updating instantly',
      'Category breakdowns, spending rate, and weekday-vs-weekend splits',
      'Compare a period against recent history or the same period last year',
      'Every number drills down into the exact transactions behind it',
      'Rearrange the dashboard panels to match how you actually look at your finances',
    ],
  },
  {
    title: 'Own your data',
    items: [
      'Full backup and restore as a plain JSON file, with a choice of replace or merge on import',
      'Delete everything in one confirmed action',
      'Request persistent browser storage so your data survives routine browser cleanups',
    ],
  },
];

@Component({
  selector: 'app-home-landing',
  imports: [ButtonComponent, FlexComponent, NgIcon, PaperComponent, TypographyComponent],
  templateUrl: './home-landing.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [
    provideIcons({
      tablerShieldLock,
      tablerCoin,
      tablerMapPin,
      tablerUsers,
      tablerBulb,
      tablerFileImport,
      tablerTags,
      tablerChartBar,
    }),
  ],
})
export class HomeLandingComponent {
  protected readonly valueProps = VALUE_PROPS;
  protected readonly processSteps = PROCESS_STEPS;
  protected readonly featureGroups = FEATURE_GROUPS;
}
