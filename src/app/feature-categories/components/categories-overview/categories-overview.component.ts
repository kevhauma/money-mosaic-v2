import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  tablerArchive,
  tablerArchiveOff,
  tablerChevronDown,
  tablerChevronUp,
  tablerDotsVertical,
  tablerPencil,
  tablerPlus,
  tablerTrash,
} from '@ng-icons/tabler-icons';
import type { Category } from '@/core/data-access';
import {
  BadgeComponent,
  ButtonComponent,
  ConfirmDialogComponent,
  DropdownComponent,
  EmptyStateComponent,
  FlexComponent,
  LabelComponent,
  LoadingSkeletonComponent,
  PageHeaderComponent,
  TableComponent,
  TabsComponent,
  TypographyComponent,
  type BadgeColor,
  type TabDefinition,
} from '@/shared/ui';
import { createConfirmState, formatDate } from '@/shared/utils';
import { categoryHasEnded } from '@/core/categorisation';
import { CATEGORY_ICON_SET, categoryIconName } from '../../category-icons';
import { CategoriesStore } from '@/core/state';
import type { CategoryRowVm } from '../../category-row-vm';
import {
  CategoryFormComponent,
  type CategoryFormValue,
} from '../category-form/category-form.component';

const todayIso = (): string => new Date().toISOString().slice(0, 10);

/** Which badge colour each kind takes. A lookup, not a `switch` in a method the template calls. */
const KIND_BADGE_COLORS: Record<Category['kind'], BadgeColor | undefined> = {
  income: 'success',
  neutral: 'neutral',
  expense: undefined,
};

const CATEGORIES_TABS: TabDefinition[] = [
  { label: 'Categories', value: 'categories', link: '/categories', exact: true },
  { label: 'Rules', value: 'rules', link: '/categories/rules' },
];

@Component({
  selector: 'app-categories-overview',
  imports: [
    NgIcon,
    CategoryFormComponent,
    BadgeComponent,
    ButtonComponent,
    ConfirmDialogComponent,
    DropdownComponent,
    EmptyStateComponent,
    FlexComponent,
    LabelComponent,
    LoadingSkeletonComponent,
    PageHeaderComponent,
    TableComponent,
    TabsComponent,
    TypographyComponent,
  ],
  templateUrl: './categories-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [
    provideIcons({
      ...CATEGORY_ICON_SET,
      tablerPlus,
      tablerDotsVertical,
      tablerPencil,
      tablerArchive,
      tablerArchiveOff,
      tablerTrash,
      tablerChevronUp,
      tablerChevronDown,
    }),
  ],
})
export class CategoriesOverviewComponent {
  protected readonly categoriesTabs = CATEGORIES_TABS;

  protected readonly categoriesStore = inject(CategoriesStore);
  protected readonly categoryIconName = categoryIconName;

  protected readonly showArchived = signal(false);
  protected readonly visibleCategories = computed(() =>
    this.showArchived()
      ? this.categoriesStore.categories()
      : this.categoriesStore.activeCategories(),
  );

  /**
   * Every row's render state, joined once (TICKET-CAT-10) — the `@for` reads plain fields instead
   * of running six method calls per row per change-detection pass. `first`/`last` are measured
   * against the **full** ordered list, not the visible one, so the reorder arrows still refer to
   * the order actually being edited when the archived rows are hidden.
   */
  protected readonly categoryRows = computed<CategoryRowVm[]>(() => {
    const ordered = this.categoriesStore.categories();
    const firstId = ordered[0]?.id;
    const lastId = ordered[ordered.length - 1]?.id;
    const countById = this.categoriesStore.transactionCountById();
    const today = todayIso();

    return this.visibleCategories().map((category) => ({
      category,
      iconName: categoryIconName(category.icon),
      kindBadgeColor: KIND_BADGE_COLORS[category.kind],
      transactionCount: category.id != null ? (countById.get(category.id) ?? 0) : 0,
      isFirst: category.id === firstId,
      isLast: category.id === lastId,
      endedLabel: categoryHasEnded(category, today)
        ? `Ended ${formatDate(category.activeUntil as string)}`
        : '',
    }));
  });

  protected readonly formOpen = signal(false);
  protected readonly editingCategory = signal<Category | null>(null);

  protected readonly deleteConfirm = createConfirmState<Category>();
  protected readonly deleteMessage = computed(() => {
    const target = this.deleteConfirm.pending();
    if (!target) {
      return '';
    }
    const count = this.transactionCountFor(target);
    return count > 0
      ? `${count} transaction${count === 1 ? '' : 's'} will become uncategorised. This cannot be undone.`
      : 'This cannot be undone.';
  });

  protected openAddForm(): void {
    this.editingCategory.set(null);
    this.formOpen.set(true);
  }

  protected openEditForm(category: Category): void {
    this.editingCategory.set(category);
    this.formOpen.set(true);
  }

  protected async saveCategory(value: CategoryFormValue): Promise<void> {
    const editing = this.editingCategory();
    if (editing?.id != null) {
      await this.categoriesStore.updateCategory(editing.id, value);
    } else {
      await this.categoriesStore.addCategory({ ...value, archived: false, isSystem: false });
    }
  }

  protected moveCategory(category: Category, direction: 'up' | 'down'): void {
    if (category.id == null) {
      return;
    }
    void this.categoriesStore.moveCategory(category.id, direction);
  }

  protected toggleArchive(category: Category): void {
    if (category.id == null) {
      return;
    }
    void (category.archived
      ? this.categoriesStore.unarchiveCategory(category.id)
      : this.categoriesStore.archiveCategory(category.id));
  }

  protected confirmDelete(category: Category): void {
    this.deleteConfirm.request(category);
  }

  protected deleteConfirmed(): void {
    const target = this.deleteConfirm.confirm();
    if (target?.id != null) {
      void this.categoriesStore.removeCategory(target.id);
    }
  }

  /** Still a method: the delete-confirmation message needs it outside the row loop. */
  protected transactionCountFor(category: Category): number {
    return category.id != null
      ? (this.categoriesStore.transactionCountById().get(category.id) ?? 0)
      : 0;
  }
}
