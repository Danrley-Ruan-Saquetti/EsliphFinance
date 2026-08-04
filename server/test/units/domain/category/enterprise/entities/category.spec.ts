import { describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { InvariantError } from '@core/errors/invariant-error'
import { Category } from '@domain/category/enterprise/entities/category'
import { CategoryNature } from '@domain/category/enterprise/value-objects/category-nature'

describe('Category', () => {
  it('deve criar a categoria com o nome, a natureza, o ícone e a cor informados (RN029)', () => {
    const ownerId = new UniqueEntityID()

    const category = Category.create({ ownerId, name: 'Alimentação', nature: 'EXPENSE', icon: 'restaurant', color: '#E53935' })

    expect(category.ownerId).toBe(ownerId)
    expect(category.name).toBe('Alimentação')
    expect(category.nature).toBe('EXPENSE')
    expect(category.icon).toBe('restaurant')
    expect(category.color).toBe('#E53935')
    expect(category.createdAt).toBeInstanceOf(Date)
    expect(category.updatedAt).toBeUndefined()
  })

  it('deve criar a categoria com a natureza "Receita" (RN030)', () => {
    const category = Category.create({ ownerId: new UniqueEntityID(), name: 'Salário', nature: 'INCOME', icon: 'cash', color: '#43A047' })

    expect(category.nature).toBe('INCOME')
  })

  it('deve criar a categoria com a natureza "Ambas" (RN030)', () => {
    const category = Category.create({ ownerId: new UniqueEntityID(), name: 'Ajustes', nature: 'BOTH', icon: 'swap', color: '#43A047' })

    expect(category.nature).toBe('BOTH')
  })

  it('deve lançar InvariantError quando a natureza estiver fora do domínio permitido (RN030)', () => {
    expect(() =>
      Category.create({ ownerId: new UniqueEntityID(), name: 'Transferências', nature: 'TRANSFER' as CategoryNature, icon: 'swap', color: '#E53935' }),
    ).toThrow(InvariantError)
  })

  it('deve remover os espaços das extremidades do nome', () => {
    const category = Category.create({ ownerId: new UniqueEntityID(), name: '  Alimentação  ', nature: 'EXPENSE', icon: 'restaurant', color: '#E53935' })

    expect(category.name).toBe('Alimentação')
  })

  it('deve lançar InvariantError quando o nome for vazio (RN029)', () => {
    expect(() => Category.create({ ownerId: new UniqueEntityID(), name: '   ', nature: 'EXPENSE', icon: 'restaurant', color: '#E53935' })).toThrow(
      InvariantError,
    )
  })

  it('deve aceitar o nome com o tamanho máximo permitido', () => {
    const name = 'a'.repeat(Category.NAME_MAX_LENGTH)

    const category = Category.create({ ownerId: new UniqueEntityID(), name, nature: 'EXPENSE', icon: 'restaurant', color: '#E53935' })

    expect(category.name).toBe(name)
  })

  it('deve lançar InvariantError quando o nome exceder o tamanho máximo', () => {
    const name = 'a'.repeat(Category.NAME_MAX_LENGTH + 1)

    expect(() => Category.create({ ownerId: new UniqueEntityID(), name, nature: 'EXPENSE', icon: 'restaurant', color: '#E53935' })).toThrow(InvariantError)
  })

  it('deve normalizar o ícone para letras minúsculas (RN029)', () => {
    const category = Category.create({ ownerId: new UniqueEntityID(), name: 'Compras', nature: 'EXPENSE', icon: '  Shopping-Cart  ', color: '#E53935' })

    expect(category.icon).toBe('shopping-cart')
  })

  it('deve lançar InvariantError quando o ícone estiver fora do formato permitido (RN029)', () => {
    expect(() => Category.create({ ownerId: new UniqueEntityID(), name: 'Compras', nature: 'EXPENSE', icon: 'shopping cart', color: '#E53935' })).toThrow(
      InvariantError,
    )
    expect(() => Category.create({ ownerId: new UniqueEntityID(), name: 'Compras', nature: 'EXPENSE', icon: '', color: '#E53935' })).toThrow(InvariantError)
  })

  it('deve lançar InvariantError quando o ícone exceder o tamanho máximo', () => {
    const icon = 'a'.repeat(Category.ICON_MAX_LENGTH + 1)

    expect(() => Category.create({ ownerId: new UniqueEntityID(), name: 'Compras', nature: 'EXPENSE', icon, color: '#E53935' })).toThrow(InvariantError)
  })

  it('deve normalizar a cor para letras maiúsculas (RN029)', () => {
    const category = Category.create({ ownerId: new UniqueEntityID(), name: 'Alimentação', nature: 'EXPENSE', icon: 'restaurant', color: '  #e53935  ' })

    expect(category.color).toBe('#E53935')
  })

  it('deve lançar InvariantError quando a cor estiver fora do formato hexadecimal #RRGGBB (RN029)', () => {
    expect(() => Category.create({ ownerId: new UniqueEntityID(), name: 'Alimentação', nature: 'EXPENSE', icon: 'restaurant', color: 'E53935' })).toThrow(
      InvariantError,
    )
    expect(() => Category.create({ ownerId: new UniqueEntityID(), name: 'Alimentação', nature: 'EXPENSE', icon: 'restaurant', color: '#E39' })).toThrow(
      InvariantError,
    )
    expect(() => Category.create({ ownerId: new UniqueEntityID(), name: 'Alimentação', nature: 'EXPENSE', icon: 'restaurant', color: '#GGGGGG' })).toThrow(
      InvariantError,
    )
  })

  it('deve preservar o identificador e as datas informadas', () => {
    const id = new UniqueEntityID()
    const createdAt = new Date('2026-01-15T12:00:00.000Z')
    const updatedAt = new Date('2026-02-20T12:00:00.000Z')

    const category = Category.create(
      { ownerId: new UniqueEntityID(), name: 'Alimentação', nature: 'EXPENSE', icon: 'restaurant', color: '#E53935', createdAt, updatedAt },
      id,
    )

    expect(category.id).toBe(id)
    expect(category.createdAt).toEqual(createdAt)
    expect(category.updatedAt).toEqual(updatedAt)
  })
})
