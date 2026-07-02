import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  tablerArrowsExchange,
  tablerBuildingBank,
  tablerFileImport,
  tablerHome,
  tablerMenu2,
  tablerTags,
} from '@ng-icons/tabler-icons';
import { TransactionsStore } from '@/feature-transactions';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIcon],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [
    provideIcons({
      tablerMenu2,
      tablerHome,
      tablerBuildingBank,
      tablerFileImport,
      tablerArrowsExchange,
      tablerTags,
    }),
  ],
})
export class App {
  protected readonly transactionsStore = inject(TransactionsStore);
}
