import { Category } from '@domain/category/enterprise/entities/category'

export abstract class CategoriesRepository {
  abstract create(category: Category): Promise<void>

  abstract findById(id: string): Promise<Category | null>
}
