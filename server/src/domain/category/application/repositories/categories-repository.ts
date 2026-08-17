import { Category } from '@domain/category/enterprise/entities/category'
import { CategoryNature } from '@domain/category/enterprise/value-objects/category-nature'

export interface FindManyByOwnerIdOptions {
  nature?: CategoryNature
  includeArchived?: boolean
}

export abstract class CategoriesRepository {
  abstract create(category: Category): Promise<void>

  abstract save(category: Category): Promise<void>

  abstract delete(id: string): Promise<void>

  abstract findById(id: string): Promise<Category | null>

  abstract findManyByOwnerId(ownerId: string, options?: FindManyByOwnerIdOptions): Promise<Category[]>

  abstract hasSubcategories(parentId: string): Promise<boolean>
}
