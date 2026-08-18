import { Either, left, right } from '@core/either'
import { NotAllowedError } from '@core/errors/not-allowed-error'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { UseCase } from '@core/use-case'
import { CategoriesRepository } from '@domain/category/application/repositories/categories-repository'

export interface DeleteCategoryRequest {
  categoryId: string
  ownerId: string
}

export type DeleteCategoryResponse = Either<ResourceNotFoundError | NotAllowedError, null>

export class DeleteCategoryUseCase implements UseCase<DeleteCategoryRequest, DeleteCategoryResponse> {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async execute({ categoryId, ownerId }: DeleteCategoryRequest): Promise<DeleteCategoryResponse> {
    const category = await this.categoriesRepository.findById(categoryId)

    if (!category || category.ownerId.toString() !== ownerId) {
      return left(new ResourceNotFoundError('Categoria não encontrada'))
    }

    if (await this.categoriesRepository.hasSubcategories(categoryId)) {
      return left(new NotAllowedError('Categoria possui subcategorias vinculadas; arquive-a em vez de excluí-la'))
    }

    await this.categoriesRepository.delete(categoryId)

    return right(null)
  }
}
