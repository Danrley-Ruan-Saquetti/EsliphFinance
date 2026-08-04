import { Either, right } from '@core/either'
import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { UseCase } from '@core/use-case'
import { CategoriesRepository } from '@domain/category/application/repositories/categories-repository'
import { Category } from '@domain/category/enterprise/entities/category'
import { CategoryNature } from '@domain/category/enterprise/value-objects/category-nature'

export interface CreateCategoryRequest {
  ownerId: string
  name: string
  nature: CategoryNature
  icon: string
  color: string
}

export type CreateCategoryResponse = Either<never, { category: Category }>

export class CreateCategoryUseCase implements UseCase<CreateCategoryRequest, CreateCategoryResponse> {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async execute({ ownerId, name, nature, icon, color }: CreateCategoryRequest): Promise<CreateCategoryResponse> {
    const category = Category.create({ ownerId: new UniqueEntityID(ownerId), name, nature, icon, color })

    await this.categoriesRepository.create(category)

    return right({ category })
  }
}
