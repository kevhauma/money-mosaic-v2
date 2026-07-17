import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerChevronLeft, tablerChevronRight } from '@ng-icons/tabler-icons';
import { type PageRange } from '@/shared/utils';
import { ButtonComponent } from '../button/button.component';
import { FlexComponent } from '../flex/flex.component';
import { TypographyComponent } from '../typography/typography.component';

/** Presentational pager (holds no state of its own) — the caller owns the page and reacts to `pageChange`. */
@Component({
  selector: 'mm-paginator',
  imports: [NgIcon, ButtonComponent, FlexComponent, TypographyComponent],
  templateUrl: './paginator.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerChevronLeft, tablerChevronRight })],
})
export class PaginatorComponent {
  readonly currentPage = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly pageRange = input.required<PageRange>();

  readonly pageChange = output<number>();

  protected onPrev(): void {
    this.pageChange.emit(this.currentPage() - 1);
  }

  protected onNext(): void {
    this.pageChange.emit(this.currentPage() + 1);
  }
}
