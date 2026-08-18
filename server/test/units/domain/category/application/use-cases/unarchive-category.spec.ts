import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { UnarchiveCategoryUseCase } from '@domain/category/application/use-cases/unarchive-category'
import { InMemoryCategoriesRepository } from '@infra/database/in-memory/in-memory-categories-repository'
import { makeCategory } from '@tests/factories/make-category'

let categoriesRepository: InMemoryCategoriesRepository
let sut: UnarchiveCategoryUseCase

describe('Desarquivar categoria', () => {
  beforeEach(() => {
    categoriesRepository = new InMemoryCategoriesRepository()
    sut = new UnarchiveCategoryUseCase(categoriesRepository)
  })

  it('deve desarquivar a categoria do usuário (RN083)', async () => {
    const ownerId = new UniqueEntityID()
    const category = makeCategory({ ownerId, archivedAt: new Date() })

    await categoriesRepository.create(category)

    const result = await sut.execute({ categoryId: category.id.toString(), ownerId: ownerId.toString() })

    expect(result.isRight()).toBe(true)
    expect(categoriesRepository.items[0].isArchived).toBe(false)
  })

  it('deve rejeitar quando a categoria não existir', async () => {
    const result = await sut.execute({ categoryId: new UniqueEntityID().toString(), ownerId: new UniqueEntityID().toString() })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })

  it('deve tratar a categoria de outro usuário como inexistente (RN010, RN011)', async () => {
    const category = makeCategory({ ownerId: new UniqueEntityID(), archivedAt: new Date() })

    await categoriesRepository.create(category)

    const result = await sut.execute({ categoryId: category.id.toString(), ownerId: new UniqueEntityID().toString() })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })
})
