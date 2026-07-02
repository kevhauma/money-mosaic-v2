import { Injectable, computed, inject, signal } from '@angular/core';
import { CategoriesRepository, type Category } from '@/core/data-access';

@Injectable({ providedIn: 'root' })
export class CategoriesStore {
  private readonly categoriesRepository = inject(CategoriesRepository);

  private readonly categoriesSignal = signal<Category[]>([]);
  readonly categories = this.categoriesSignal.asReadonly();

  readonly activeCategories = computed(() =>
    this.categoriesSignal().filter((category) => !category.archived),
  );

  readonly categoriesById = computed(
    () => new Map(this.categoriesSignal().map((category) => [category.id!, category])),
  );

  hydrate = async (): Promise<void> => {
    this.categoriesSignal.set(await this.categoriesRepository.getAll());
  };
}
