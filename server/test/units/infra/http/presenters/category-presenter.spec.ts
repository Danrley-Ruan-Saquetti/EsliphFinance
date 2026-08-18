import { describe, expect, it } from 'vitest'

import { CategoryPresenter } from '@infra/http/presenters/category-presenter'
import { makeCategory } from '@tests/factories/make-category'

describe('CategoryPresenter', () => {
  it('deve expor a categoria com o identificador em texto', () => {
    const category = makeCategory()

    const result = CategoryPresenter.toHTTP(category)

    expect(result).toEqual({
      id: category.id.toString(),
      parentId: null,
      name: category.name,
      nature: category.nature,
      icon: category.icon,
      color: category.color,
      createdAt: category.createdAt,
      updatedAt: null,
      archivedAt: null,
    })
  })

  it('deve expor a natureza "Receita" da categoria (RN030)', () => {
    const category = makeCategory({ nature: 'INCOME' })

    expect(CategoryPresenter.toHTTP(category).nature).toBe('INCOME')
  })

  it('deve expor a data de atualização quando a categoria já foi alterada', () => {
    const updatedAt = new Date('2026-02-20T12:00:00.000Z')
    const category = makeCategory({ updatedAt })

    expect(CategoryPresenter.toHTTP(category).updatedAt).toEqual(updatedAt)
  })

  it('deve expor a data de arquivamento quando a categoria está arquivada (RN034)', () => {
    const archivedAt = new Date('2026-03-10T12:00:00.000Z')
    const category = makeCategory({ archivedAt })

    expect(CategoryPresenter.toHTTP(category).archivedAt).toEqual(archivedAt)
  })

  it('deve expor a categoria raiz com as filhas aninhadas (RN031)', () => {
    const parent = makeCategory({ name: 'Alimentação' })
    const child = makeCategory({ name: 'Restaurante', parentId: parent.id })

    const result = CategoryPresenter.toTreeHTTP({ category: parent, children: [child] })

    expect(result).toEqual({ ...CategoryPresenter.toHTTP(parent), children: [CategoryPresenter.toHTTP(child)] })
  })
})
