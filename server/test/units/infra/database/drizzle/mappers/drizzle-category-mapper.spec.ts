import { describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { CategoryRecord, DrizzleCategoryMapper } from '@infra/database/drizzle/mappers/drizzle-category-mapper'
import { makeCategory } from '@tests/factories/make-category'

function makeRecord(override: Partial<CategoryRecord> = {}): CategoryRecord {
  return {
    id: new UniqueEntityID().toString(),
    ownerId: new UniqueEntityID().toString(),
    parentId: null,
    name: 'Alimentação',
    nature: 'EXPENSE',
    icon: 'restaurant',
    color: '#E53935',
    createdAt: new Date('2026-01-15T12:00:00.000Z'),
    updatedAt: null,
    archivedAt: null,
    ...override,
  }
}

describe('DrizzleCategoryMapper', () => {
  it('deve converter o registro do banco em entidade preservando o identificador', () => {
    const record = makeRecord()

    const category = DrizzleCategoryMapper.toDomain(record)

    expect(category.id.toString()).toBe(record.id)
    expect(category.ownerId.toString()).toBe(record.ownerId)
    expect(category.parentId).toBeNull()
    expect(category.name).toBe(record.name)
    expect(category.nature).toBe(record.nature)
    expect(category.icon).toBe(record.icon)
    expect(category.color).toBe(record.color)
    expect(category.createdAt).toEqual(record.createdAt)
    expect(category.updatedAt).toBeNull()
    expect(category.archivedAt).toBeNull()
  })

  it('deve converter o registro do banco com a natureza "Ambas" (RN030)', () => {
    const category = DrizzleCategoryMapper.toDomain(makeRecord({ nature: 'BOTH' }))

    expect(category.nature).toBe('BOTH')
  })

  it('deve converter o registro do banco preservando o vínculo com a categoria pai (RN031)', () => {
    const parentId = new UniqueEntityID().toString()

    const category = DrizzleCategoryMapper.toDomain(makeRecord({ parentId }))

    expect(category.parentId?.toString()).toBe(parentId)
  })

  it('deve converter o registro do banco com data de atualização preenchida', () => {
    const updatedAt = new Date('2026-02-20T12:00:00.000Z')

    const category = DrizzleCategoryMapper.toDomain(makeRecord({ updatedAt }))

    expect(category.updatedAt).toEqual(updatedAt)
  })

  it('deve converter o registro do banco com a categoria arquivada (RN034)', () => {
    const archivedAt = new Date('2026-03-10T12:00:00.000Z')

    const category = DrizzleCategoryMapper.toDomain(makeRecord({ archivedAt }))

    expect(category.archivedAt).toEqual(archivedAt)
    expect(category.isArchived).toBe(true)
  })

  it('deve converter a entidade em registro de persistência', () => {
    const category = makeCategory()

    const record = DrizzleCategoryMapper.toPersistence(category)

    expect(record).toEqual({
      id: category.id.toString(),
      ownerId: category.ownerId.toString(),
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

  it('deve manter a entidade equivalente ao percorrer os dois sentidos da conversão', () => {
    const record = makeRecord()

    expect(DrizzleCategoryMapper.toPersistence(DrizzleCategoryMapper.toDomain(record))).toEqual(record)
  })
})
