import {
  tablerBuildingBank,
  tablerChartLine,
  tablerPigMoney,
  tablerUsers,
  tablerWallet,
} from '@ng-icons/tabler-icons';
import type { Account } from '@/core/data-access';

export const ACCOUNT_ICON_SET = {
  accountWallet: tablerWallet,
  accountPiggyBank: tablerPigMoney,
  accountUsers: tablerUsers,
  accountChartLine: tablerChartLine,
  accountBuildingBank: tablerBuildingBank,
};

const ICON_NAME_BY_STORED_VALUE: Record<string, keyof typeof ACCOUNT_ICON_SET> = {
  wallet: 'accountWallet',
  'piggy-bank': 'accountPiggyBank',
  users: 'accountUsers',
  'chart-line': 'accountChartLine',
  'building-bank': 'accountBuildingBank',
};

export const accountIconName = (icon: string): string =>
  ICON_NAME_BY_STORED_VALUE[icon] ?? 'accountWallet';

export const ICON_BY_ACCOUNT_TYPE: Record<Account['type'], string> = {
  checking: 'wallet',
  savings: 'piggy-bank',
  joint: 'users',
  invest: 'chart-line',
};
