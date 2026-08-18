import { describe, expect, it } from 'vitest'

import { validateSubcategoryHierarchy } from '@domain/category/application/use-cases/validate-subcategory-hierarchy'
import { IncompatibleCategoryNatureError } from '@domain/category/application/use-cases/errors/incompatible-category-nature-error'
import { InvalidCategoryHierarchyError } from '@domain/category/application/use-cases/errors/invalid-category-hierarchy-error'
import { makeCategory } from '@tests/factories/make-category'

describe('validateSubcategoryHierarchy', () => {
  it('deve aprovar o vínculo quando o pai e a filha têm a mesma natureza (RN033)', () => {
    const parent = makeCategory({ nature: 'EXPENSE' })

    expect(validateSubcategoryHierarchy(parent, 'EXPENSE')).toBeNull()
  })

  it('deve aprovar o vínculo de filha de qualquer natureza quando o pai for "Ambas" (RN033)', () => {
    const parent = makeCategory({ nature: 'BOTH' })

    expect(validateSubcategoryHierarchy(parent, 'INCOME')).toBeNull()
    expect(validateSubcategoryHierarchy(parent, 'EXPENSE')).toBeNull()
  })

  it('deve rejeitar quando a natureza da filha diverge da natureza única do pai (RN033)', () => {
    const parent = makeCategory({ nature: 'EXPENSE' })

    const error = validateSubcategoryHierarchy(parent, 'INCOME')

    expect(error).toBeInstanceOf(IncompatibleCategoryNatureError)
  })

  it('deve rejeitar uma filha "Ambas" quando o pai tiver natureza única (RN033)', () => {
    const parent = makeCategory({ nature: 'EXPENSE' })

    const error = validateSubcategoryHierarchy(parent, 'BOTH')

    expect(error).toBeInstanceOf(IncompatibleCategoryNatureError)
  })

  it('deve rejeitar o vínculo quando o pai já for subcategoria, limitando a hierarquia a dois níveis (RN032)', () => {
    const parent = makeCategory({ nature: 'EXPENSE', parentId: makeCategory().id })

    const error = validateSubcategoryHierarchy(parent, 'EXPENSE')

    expect(error).toBeInstanceOf(InvalidCategoryHierarchyError)
  })

  it('deve verificar a profundidade da hierarquia antes da compatibilidade de natureza (RN032)', () => {
    const parent = makeCategory({ nature: 'INCOME', parentId: makeCategory().id })

    const error = validateSubcategoryHierarchy(parent, 'EXPENSE')

    expect(error).toBeInstanceOf(InvalidCategoryHierarchyError)
  })
})
