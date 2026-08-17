import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { NotAllowedError } from '@core/errors/not-allowed-error'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { DeleteCategoryUseCase } from '@domain/category/application/use-cases/delete-category'
import { InMemoryCategoriesRepository } from '@infra/database/in-memory/in-memory-categories-repository'
import { DeleteCategoryController } from '@infra/http/controllers/delete-category.controller'
import { makeCategory } from '@tests/factories/make-category'

let categoriesRepository: InMemoryCategoriesRepository
let sut: DeleteCategoryController

describe('DeleteCategoryController', () => {
  beforeEach(() => {
    categoriesRepository = new InMemoryCategoriesRepository()
    sut = new DeleteCategoryController(new DeleteCategoryUseCase(categoriesRepository))
  })

  it('deve excluir a categoria sem vínculo (RN034)', async () => {
    const ownerId = new UniqueEntityID()
    const category = makeCategory({ ownerId })

    await categoriesRepository.create(category)

    await sut.handle({ id: ownerId.toString() }, { id: category.id.toString() })

    expect(categoriesRepository.items).toHaveLength(0)
  })

  it('deve lançar o erro quando houver subcategoria vinculada (RN034)', async () => {
    const ownerId = new UniqueEntityID()
    const parent = makeCategory({ ownerId })
    const child = makeCategory({ ownerId, parentId: parent.id })

    await categoriesRepository.create(parent)
    await categoriesRepository.create(child)

    await expect(sut.handle({ id: ownerId.toString() }, { id: parent.id.toString() })).rejects.toBeInstanceOf(NotAllowedError)
  })

  it('deve lançar o erro quando a categoria não pertencer ao usuário autenticado (RN010, RN011)', async () => {
    const category = makeCategory({ ownerId: new UniqueEntityID() })

    await categoriesRepository.create(category)

    await expect(sut.handle({ id: new UniqueEntityID().toString() }, { id: category.id.toString() })).rejects.toBeInstanceOf(ResourceNotFoundError)
  })
})
