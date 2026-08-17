import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { UnarchiveCategoryUseCase } from '@domain/category/application/use-cases/unarchive-category'
import { InMemoryCategoriesRepository } from '@infra/database/in-memory/in-memory-categories-repository'
import { UnarchiveCategoryController } from '@infra/http/controllers/unarchive-category.controller'
import { makeCategory } from '@tests/factories/make-category'

let categoriesRepository: InMemoryCategoriesRepository
let sut: UnarchiveCategoryController

describe('UnarchiveCategoryController', () => {
  beforeEach(() => {
    categoriesRepository = new InMemoryCategoriesRepository()
    sut = new UnarchiveCategoryController(new UnarchiveCategoryUseCase(categoriesRepository))
  })

  it('deve desarquivar a categoria e devolvê-la no formato de resposta (RN083)', async () => {
    const ownerId = new UniqueEntityID()
    const category = makeCategory({ ownerId, archivedAt: new Date() })

    await categoriesRepository.create(category)

    const response = await sut.handle({ id: ownerId.toString() }, { id: category.id.toString() })

    expect(response.category.archivedAt).toBeNull()
  })

  it('deve lançar o erro quando a categoria não pertencer ao usuário autenticado (RN010, RN011)', async () => {
    const category = makeCategory({ ownerId: new UniqueEntityID(), archivedAt: new Date() })

    await categoriesRepository.create(category)

    await expect(sut.handle({ id: new UniqueEntityID().toString() }, { id: category.id.toString() })).rejects.toBeInstanceOf(ResourceNotFoundError)
  })
})
