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

  findById(id: string): Promise<Category | null> {
    const category = this.items.find(item => item.id.toString() === id)

    return Promise.resolve(category ?? null)
  }
}
