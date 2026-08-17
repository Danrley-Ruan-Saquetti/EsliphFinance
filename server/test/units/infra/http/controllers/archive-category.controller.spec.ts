import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { ArchiveCategoryUseCase } from '@domain/category/application/use-cases/archive-category'
import { InMemoryCategoriesRepository } from '@infra/database/in-memory/in-memory-categories-repository'
import { ArchiveCategoryController } from '@infra/http/controllers/archive-category.controller'
import { makeCategory } from '@tests/factories/make-category'

let categoriesRepository: InMemoryCategoriesRepository
let sut: ArchiveCategoryController

describe('ArchiveCategoryController', () => {
  beforeEach(() => {
    categoriesRepository = new InMemoryCategoriesRepository()
    sut = new ArchiveCategoryController(new ArchiveCategoryUseCase(categoriesRepository))
  })

  it('deve arquivar a categoria e devolvê-la no formato de resposta (RN034)', async () => {
    const ownerId = new UniqueEntityID()
    const category = makeCategory({ ownerId })

    await categoriesRepository.create(category)

    const response = await sut.handle({ id: ownerId.toString() }, { id: category.id.toString() })

    expect(response.category.archivedAt).toBeInstanceOf(Date)
  })

  it('deve lançar o erro quando a categoria não pertencer ao usuário autenticado (RN010, RN011)', async () => {
    const category = makeCategory({ ownerId: new UniqueEntityID() })

    await categoriesRepository.create(category)

    await expect(sut.handle({ id: new UniqueEntityID().toString() }, { id: category.id.toString() })).rejects.toBeInstanceOf(ResourceNotFoundError)
  })
})
