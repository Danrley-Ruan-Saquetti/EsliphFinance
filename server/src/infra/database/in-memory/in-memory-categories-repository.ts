import { Injectable } from '@nestjs/common'

import { CategoriesRepository, FindManyByOwnerIdOptions } from '@domain/category/application/repositories/categories-repository'
import { Category } from '@domain/category/enterprise/entities/category'

@Injectable()
export class InMemoryCategoriesRepository extends CategoriesRepository {
  readonly items: Category[] = []

  create(category: Category): Promise<void> {
    this.items.push(category)

    return Promise.resolve()
  }

  save(category: Category): Promise<void> {
    const index = this.items.findIndex(item => item.id.equals(category.id))

    if (index >= 0) {
      this.items[index] = category
    }

    return Promise.resolve()
  }

  delete(id: string): Promise<void> {
    const index = this.items.findIndex(item => item.id.toString() === id)

    if (index >= 0) {
      this.items.splice(index, 1)
    }

    return Promise.resolve()
  }

  findById(id: string): Promise<Category | null> {
    const category = this.items.find(item => item.id.toString() === id)

    return Promise.resolve(category ?? null)
  }

  findManyByOwnerId(ownerId: string, options: FindManyByOwnerIdOptions = {}): Promise<Category[]> {
    const found = this.items.filter(
      item =>
        item.ownerId.toString() === ownerId &&
        (!options.nature || item.nature === options.nature || item.nature === Category.BOTH_NATURE) &&
        (options.includeArchived || !item.isArchived),
    )

    return Promise.resolve(found)
  }

  hasSubcategories(parentId: string): Promise<boolean> {
    return Promise.resolve(this.items.some(item => item.parentId?.toString() === parentId))
  }
}
