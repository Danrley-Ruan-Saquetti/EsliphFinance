import { Injectable } from '@nestjs/common'

import { CategoriesRepository } from '@domain/category/application/repositories/categories-repository'
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

  hasSubcategories(parentId: string): Promise<boolean> {
    return Promise.resolve(this.items.some(item => item.parentId?.toString() === parentId))
  }
}
