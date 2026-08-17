import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { CreateCategoryUseCase } from '@domain/category/application/use-cases/create-category'
import { InMemoryCategoriesRepository } from '@infra/database/in-memory/in-memory-categories-repository'
import { CreateCategoryController } from '@infra/http/controllers/create-category.controller'

let categoriesRepository: InMemoryCategoriesRepository
let sut: CreateCategoryController

describe('CreateCategoryController', () => {
  beforeEach(() => {
    categoriesRepository = new InMemoryCategoriesRepository()
    sut = new CreateCategoryController(new CreateCategoryUseCase(categoriesRepository))
  })

  it('deve devolver a categoria criada no formato de resposta', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }

    const response = await sut.handle(currentUser, { name: 'Alimentação', nature: 'EXPENSE', icon: 'restaurant', color: '#E53935' })

    expect(response.category).toEqual({
      id: categoriesRepository.items[0].id.toString(),
      parentId: null,
      name: 'Alimentação',
      nature: 'EXPENSE',
      icon: 'restaurant',
      color: '#E53935',
      createdAt: categoriesRepository.items[0].createdAt,
      updatedAt: null,
      archivedAt: null,
    })
  })

  it('deve devolver a categoria com a natureza "Ambas" (RN030)', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }

    const response = await sut.handle(currentUser, { name: 'Ajustes', nature: 'BOTH', icon: 'swap', color: '#43A047' })

    expect(response.category.nature).toBe('BOTH')
  })

  it('deve persistir a categoria vinculada ao usuário autenticado (RN010)', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }

    await sut.handle(currentUser, { name: 'Alimentação', nature: 'EXPENSE', icon: 'restaurant', color: '#E53935' })

    expect(categoriesRepository.items).toHaveLength(1)
    expect(categoriesRepository.items[0].ownerId.toString()).toBe(currentUser.id)
  })

  it('deve ignorar o dono informado no corpo e vincular a categoria ao usuário do token (RN010, RN011)', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }

    const forgedBody = Object.assign(
      { name: 'Alimentação', nature: 'EXPENSE' as const, icon: 'restaurant', color: '#E53935' },
      { ownerId: new UniqueEntityID().toString() },
    )

    await sut.handle(currentUser, forgedBody)

    expect(categoriesRepository.items[0].ownerId.toString()).toBe(currentUser.id)
  })
})
