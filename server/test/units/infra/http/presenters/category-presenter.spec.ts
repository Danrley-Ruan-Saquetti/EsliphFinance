import { describe, expect, it } from 'vitest'

import { CategoryPresenter } from '@infra/http/presenters/category-presenter'
import { makeCategory } from '@tests/factories/make-category'

describe('CategoryPresenter', () => {
  it('deve expor a categoria com o identificador em texto', () => {
    const category = makeCategory()

    const result = CategoryPresenter.toHTTP(category)

    expect(result).toEqual({
      id: category.id.toString(),
      name: category.name,
      nature: category.nature,
      icon: category.icon,
      color: category.color,
      createdAt: category.createdAt,
      updatedAt: null,
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
})
