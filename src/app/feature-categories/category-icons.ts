import {
  tablerBolt,
  tablerCar,
  tablerCash,
  tablerCoin,
  tablerHeartbeat,
  tablerHome,
  tablerRepeat,
  tablerShoppingBag,
  tablerShoppingCart,
  tablerTag,
  tablerToolsKitchen2,
  tablerUsers,
} from '@ng-icons/tabler-icons';

export const CATEGORY_ICON_SET = {
  categoryShoppingCart: tablerShoppingCart,
  categoryShoppingBag: tablerShoppingBag,
  categoryRepeat: tablerRepeat,
  categoryHome: tablerHome,
  categoryCar: tablerCar,
  categoryToolsKitchen: tablerToolsKitchen2,
  categoryBolt: tablerBolt,
  categoryHeartbeat: tablerHeartbeat,
  categoryCash: tablerCash,
  categoryCoin: tablerCoin,
  categoryTag: tablerTag,
  categoryUsers: tablerUsers,
};

const ICON_NAME_BY_STORED_VALUE: Record<string, keyof typeof CATEGORY_ICON_SET> = {
  'shopping-cart': 'categoryShoppingCart',
  'shopping-bag': 'categoryShoppingBag',
  repeat: 'categoryRepeat',
  home: 'categoryHome',
  car: 'categoryCar',
  'tools-kitchen': 'categoryToolsKitchen',
  bolt: 'categoryBolt',
  heartbeat: 'categoryHeartbeat',
  cash: 'categoryCash',
  coin: 'categoryCoin',
  tag: 'categoryTag',
  users: 'categoryUsers',
};

export const categoryIconName = (icon: string): string =>
  ICON_NAME_BY_STORED_VALUE[icon] ?? 'categoryTag';

export const CATEGORY_ICON_OPTIONS: { value: string; label: string }[] = [
  { value: 'shopping-cart', label: 'Shopping cart' },
  { value: 'shopping-bag', label: 'Shopping bag' },
  { value: 'repeat', label: 'Subscription' },
  { value: 'home', label: 'Housing' },
  { value: 'car', label: 'Transport' },
  { value: 'tools-kitchen', label: 'Eating out' },
  { value: 'bolt', label: 'Utilities' },
  { value: 'heartbeat', label: 'Health' },
  { value: 'cash', label: 'Cash / salary' },
  { value: 'coin', label: 'Other income' },
  { value: 'tag', label: 'Generic' },
  { value: 'users', label: 'Partner / co-owner' },
];
