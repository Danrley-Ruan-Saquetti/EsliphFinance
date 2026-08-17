import { Either, right } from '@core/either'
import { UseCase } from '@core/use-case'
import { CategoriesRepository } from '@domain/category/application/repositories/categories-repository'
import { Category } from '@domain/category/enterprise/entities/category'
import { CategoryNature } from '@domain/category/enterprise/value-objects/category-nature'

export interface CategoryTreeNode {
  category: Category
  children: Category[]
}

export interface ListCategoryTreeRequest {
  ownerId: string
  nature?: CategoryNature
  includeArchived?: boolean
}

export type ListCategoryTreeResponse = Either<never, { categories: CategoryTreeNode[] }>

export class ListCategoryTreeUseCase implements UseCase<ListCategoryTreeRequest, ListCategoryTreeResponse> {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async execute({ ownerId, nature, includeArchived }: ListCategoryTreeRequest): Promise<ListCategoryTreeResponse> {
    const categories = await this.categoriesRepository.findManyByOwnerId(ownerId, { nature, includeArchived })

    const roots = categories.filter(category => !category.parentId)
    const tree = roots.map(root => ({
      category: root,
      children: categories.filter(category => category.parentId?.toString() === root.id.toString()),
    }))

    return right({ categories: tree })
  }
}
