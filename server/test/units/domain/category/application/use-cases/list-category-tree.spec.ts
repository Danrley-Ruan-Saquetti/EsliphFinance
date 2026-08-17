import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { ListCategoryTreeUseCase } from '@domain/category/application/use-cases/list-category-tree'
import { InMemoryCategoriesRepository } from '@infra/database/in-memory/in-memory-categories-repository'
import { makeCategory } from '@tests/factories/make-category'

let categoriesRepository: InMemoryCategoriesRepository
let sut: ListCategoryTreeUseCase

describe('Listar categorias em árvore', () => {
  beforeEach(() => {
    categoriesRepository = new InMemoryCategoriesRepository()
    sut = new ListCategoryTreeUseCase(categoriesRepository)
  })

  it('deve devolver a categoria raiz com as subcategorias aninhadas (RN031)', async () => {
    const ownerId = new UniqueEntityID()
    const root = makeCategory({ ownerId, name: 'Alimentação' })
    const child = makeCategory({ ownerId, name: 'Restaurante', parentId: root.id })

    categoriesRepository.items.push(root, child)

    const result = await sut.execute({ ownerId: ownerId.toString() })

    expect(result.isRight()).toBe(true)
    expect(result.value.categories).toHaveLength(1)
    expect(result.value.categories[0].category.id).toEqual(root.id)
    expect(result.value.categories[0].children).toHaveLength(1)
    expect(result.value.categories[0].children[0].id).toEqual(child.id)
  })

  it('deve devolver a categoria raiz sem filhas com array de filhas vazio', async () => {
    const ownerId = new UniqueEntityID()

    categoriesRepository.items.push(makeCategory({ ownerId }))

    const result = await sut.execute({ ownerId: ownerId.toString() })

    expect(result.value.categories[0].children).toEqual([])
  })

  it('deve omitir categorias arquivadas por padrão (RN035)', async () => {
    const ownerId = new UniqueEntityID()

    categoriesRepository.items.push(makeCategory({ ownerId, name: 'Ativa' }), makeCategory({ ownerId, name: 'Arquivada', archivedAt: new Date() }))

    const result = await sut.execute({ ownerId: ownerId.toString() })

    expect(result.value.categories).toHaveLength(1)
    expect(result.value.categories[0].category.name).toBe('Ativa')
  })

  it('deve incluir categorias arquivadas quando solicitado (RN035)', async () => {
    const ownerId = new UniqueEntityID()

    categoriesRepository.items.push(makeCategory({ ownerId, archivedAt: new Date() }))

    const result = await sut.execute({ ownerId: ownerId.toString(), includeArchived: true })

    expect(result.value.categories).toHaveLength(1)
  })

  it('deve omitir a subcategoria de uma categoria pai arquivada, mesmo que a subcategoria em si não esteja arquivada (RN084)', async () => {
    const ownerId = new UniqueEntityID()
    const archivedParent = makeCategory({ ownerId, name: 'Pai arquivado', archivedAt: new Date() })
    const child = makeCategory({ ownerId, name: 'Filha ativa', parentId: archivedParent.id })

    categoriesRepository.items.push(archivedParent, child)

    const result = await sut.execute({ ownerId: ownerId.toString() })

    expect(result.value.categories).toEqual([])
  })

  it('deve filtrar pela natureza informada', async () => {
    const ownerId = new UniqueEntityID()

    categoriesRepository.items.push(makeCategory({ ownerId, nature: 'EXPENSE', icon: 'a' }), makeCategory({ ownerId, nature: 'INCOME', icon: 'b' }))

    const result = await sut.execute({ ownerId: ownerId.toString(), nature: 'INCOME' })

    expect(result.value.categories).toHaveLength(1)
    expect(result.value.categories[0].category.nature).toBe('INCOME')
  })

  it('deve incluir categoria de natureza "Ambas" ao filtrar por uma natureza específica (RN033)', async () => {
    const ownerId = new UniqueEntityID()

    categoriesRepository.items.push(
      makeCategory({ ownerId, nature: 'BOTH', icon: 'a' }),
      makeCategory({ ownerId, nature: 'EXPENSE', icon: 'b' }),
    )

    const result = await sut.execute({ ownerId: ownerId.toString(), nature: 'INCOME' })

    expect(result.value.categories).toHaveLength(1)
    expect(result.value.categories[0].category.nature).toBe('BOTH')
  })

  it('não deve listar categoria de outro usuário (RN010, RN011)', async () => {
    categoriesRepository.items.push(makeCategory({ ownerId: new UniqueEntityID() }))

    const result = await sut.execute({ ownerId: new UniqueEntityID().toString() })

    expect(result.value.categories).toEqual([])
  })
})
