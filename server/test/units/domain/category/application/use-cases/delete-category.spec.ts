import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { NotAllowedError } from '@core/errors/not-allowed-error'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { DeleteCategoryUseCase } from '@domain/category/application/use-cases/delete-category'
import { InMemoryCategoriesRepository } from '@infra/database/in-memory/in-memory-categories-repository'
import { makeCategory } from '@tests/factories/make-category'

let categoriesRepository: InMemoryCategoriesRepository
let sut: DeleteCategoryUseCase

describe('Excluir categoria', () => {
  beforeEach(() => {
    categoriesRepository = new InMemoryCategoriesRepository()
    sut = new DeleteCategoryUseCase(categoriesRepository)
  })

  it('deve excluir a categoria sem subcategorias vinculadas (RN034)', async () => {
    const ownerId = new UniqueEntityID()
    const category = makeCategory({ ownerId })

    await categoriesRepository.create(category)

    const result = await sut.execute({ categoryId: category.id.toString(), ownerId: ownerId.toString() })

    expect(result.isRight()).toBe(true)
    expect(categoriesRepository.items).toHaveLength(0)
  })

  it('deve rejeitar a exclusão quando houver subcategoria vinculada, orientando o arquivamento (RN034)', async () => {
    const ownerId = new UniqueEntityID()
    const parent = makeCategory({ ownerId })
    const child = makeCategory({ ownerId, parentId: parent.id })

    await categoriesRepository.create(parent)
    await categoriesRepository.create(child)

    const result = await sut.execute({ categoryId: parent.id.toString(), ownerId: ownerId.toString() })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(NotAllowedError)
    expect(categoriesRepository.items).toHaveLength(2)
  })

  it('deve rejeitar quando a categoria não existir', async () => {
    const result = await sut.execute({ categoryId: new UniqueEntityID().toString(), ownerId: new UniqueEntityID().toString() })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })

  it('deve tratar a categoria de outro usuário como inexistente (RN010, RN011)', async () => {
    const category = makeCategory({ ownerId: new UniqueEntityID() })

    await categoriesRepository.create(category)

    const result = await sut.execute({ categoryId: category.id.toString(), ownerId: new UniqueEntityID().toString() })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
    expect(categoriesRepository.items).toHaveLength(1)
  })
})
