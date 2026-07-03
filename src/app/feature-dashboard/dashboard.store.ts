import { signalStore, withState } from '@ngrx/signals';

export const DashboardStore = signalStore(
  { providedIn: 'root' },
  withState({ message: 'Money Mosaic scaffold is running.' }),
);
