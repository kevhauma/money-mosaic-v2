import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
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
  EmptyStateComponent,
  LoadingSkeletonComponent,
  PageHeaderComponent,
  type BadgeColor,
} from '@/shared/ui';
import { CATEGORY_ICON_SET, categoryIconName } from '../../category-icons';
import { CategoriesStore } from '@/core/state';
import {
  CategoryFormComponent,
  type CategoryFormValue,
} from '../category-form/category-form.component';

@Component({
  selector: 'app-categories-overview',
  imports: [
    RouterLink,
    RouterLinkActive,
    NgIcon,
    CategoryFormComponent,
    BadgeComponent,
    ButtonComponent,
    ConfirmDialogComponent,
    EmptyStateComponent,
    LoadingSkeletonComponent,
    PageHeaderComponent,
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
  protected readonly categoriesStore = inject(CategoriesStore);
  protected readonly categoryIconName = categoryIconName;

  protected readonly showArchived = signal(false);
  protected readonly visibleCategories = computed(() =>
    this.showArchived()
      ? this.categoriesStore.categories()
      : this.categoriesStore.activeCategories(),
  );

  protected readonly formOpen = signal(false);
  protected readonly editingCategory = signal<Category | null>(null);

  protected readonly deleteConfirmOpen = signal(false);
  private readonly deleteTarget = signal<Category | null>(null);
  protected readonly deleteMessage = computed(() => {
    const target = this.deleteTarget();
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

  protected isFirst(category: Category): boolean {
    return this.categoriesStore.categories()[0]?.id === category.id;
  }

  protected isLast(category: Category): boolean {
    const ordered = this.categoriesStore.categories();
    return ordered[ordered.length - 1]?.id === category.id;
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
    this.deleteTarget.set(category);
    this.deleteConfirmOpen.set(true);
  }

  protected deleteConfirmed(): void {
    const target = this.deleteTarget();
    if (target?.id != null) {
      void this.categoriesStore.removeCategory(target.id);
    }
  }

  protected badgeColorFor(kind: Category['kind']): BadgeColor | undefined {
    switch (kind) {
      case 'income':
        return 'success';
      case 'neutral':
        return 'neutral';
      case 'expense':
        return undefined;
    }
  }

  protected transactionCountFor(category: Category): number {
    return category.id != null
      ? (this.categoriesStore.transactionCountById().get(category.id) ?? 0)
      : 0;
  }
}
