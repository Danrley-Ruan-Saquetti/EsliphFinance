import { Either, left, right } from '@core/either'
import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { UseCase } from '@core/use-case'
import { CategoriesRepository } from '@domain/category/application/repositories/categories-repository'
import { IncompatibleCategoryNatureError } from '@domain/category/application/use-cases/errors/incompatible-category-nature-error'
import { InvalidCategoryHierarchyError } from '@domain/category/application/use-cases/errors/invalid-category-hierarchy-error'
import { validateSubcategoryHierarchy } from '@domain/category/application/use-cases/validate-subcategory-hierarchy'
import { Category } from '@domain/category/enterprise/entities/category'
import { CategoryNature } from '@domain/category/enterprise/value-objects/category-nature'

export interface CreateCategoryRequest {
  ownerId: string
  parentId?: string
  name: string
  nature: CategoryNature
  icon: string
  color: string
}

export type CreateCategoryResponse = Either<ResourceNotFoundError | InvalidCategoryHierarchyError | IncompatibleCategoryNatureError, { category: Category }>

export class CreateCategoryUseCase implements UseCase<CreateCategoryRequest, CreateCategoryResponse> {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async execute({ ownerId, parentId, name, nature, icon, color }: CreateCategoryRequest): Promise<CreateCategoryResponse> {
    if (parentId) {
      const parent = await this.categoriesRepository.findById(parentId)

      if (!parent || parent.ownerId.toString() !== ownerId) {
        return left(new ResourceNotFoundError('Categoria pai não encontrada'))
      }

      const hierarchyError = validateSubcategoryHierarchy(parent, nature)

      if (hierarchyError) {
        return left(hierarchyError)
      }
    }

    const category = Category.create({
      ownerId: new UniqueEntityID(ownerId),
      parentId: parentId ? new UniqueEntityID(parentId) : null,
      name,
      nature,
      icon,
      color,
    })

    await this.categoriesRepository.create(category)

    return right({ category })
  }
}
