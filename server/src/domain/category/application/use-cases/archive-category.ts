import { Either, left, right } from '@core/either'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { UseCase } from '@core/use-case'
import { CategoriesRepository } from '@domain/category/application/repositories/categories-repository'
import { Category } from '@domain/category/enterprise/entities/category'

export interface ArchiveCategoryRequest {
  categoryId: string
  ownerId: string
}

export type ArchiveCategoryResponse = Either<ResourceNotFoundError, { category: Category }>

export class ArchiveCategoryUseCase implements UseCase<ArchiveCategoryRequest, ArchiveCategoryResponse> {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async execute({ categoryId, ownerId }: ArchiveCategoryRequest): Promise<ArchiveCategoryResponse> {
    const category = await this.categoriesRepository.findById(categoryId)

    if (!category || category.ownerId.toString() !== ownerId) {
      return left(new ResourceNotFoundError('Categoria não encontrada'))
    }

    category.archive()

    await this.categoriesRepository.save(category)

    return right({ category })
  }
}
