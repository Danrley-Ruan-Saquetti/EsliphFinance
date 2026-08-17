import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { ListCategoryTreeUseCase } from '@domain/category/application/use-cases/list-category-tree'
import { InMemoryCategoriesRepository } from '@infra/database/in-memory/in-memory-categories-repository'
import { ListCategoryTreeController } from '@infra/http/controllers/list-category-tree.controller'
import { makeCategory } from '@tests/factories/make-category'

let categoriesRepository: InMemoryCategoriesRepository
let sut: ListCategoryTreeController

describe('ListCategoryTreeController', () => {
  beforeEach(() => {
    categoriesRepository = new InMemoryCategoriesRepository()
    sut = new ListCategoryTreeController(new ListCategoryTreeUseCase(categoriesRepository))
  })

  it('deve devolver as categorias do usuário autenticado no formato de árvore (RN031)', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }
    const root = makeCategory({ ownerId: new UniqueEntityID(currentUser.id), name: 'Alimentação' })

    categoriesRepository.items.push(root)

    const response = await sut.handle(currentUser, {})

    expect(response.categories).toEqual([{ ...toHTTPShape(root), children: [] }])
  })

  it('deve ignorar categorias de outro usuário (RN010, RN011)', async () => {
    categoriesRepository.items.push(makeCategory())

    const response = await sut.handle({ id: new UniqueEntityID().toString() }, {})

    expect(response.categories).toEqual([])
  })
})

function toHTTPShape(category: ReturnType<typeof makeCategory>) {
  return {
    id: category.id.toString(),
    parentId: null,
    name: category.name,
    nature: category.nature,
    icon: category.icon,
    color: category.color,
    createdAt: category.createdAt,
    updatedAt: null,
    archivedAt: null,
  }
}
