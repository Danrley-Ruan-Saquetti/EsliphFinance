import { describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { AccountGroupRecord, DrizzleAccountGroupMapper } from '@infra/database/drizzle/mappers/drizzle-account-group-mapper'
import { makeAccountGroup } from '@tests/factories/make-account-group'

function makeRecord(override: Partial<AccountGroupRecord> = {}): AccountGroupRecord {
  return {
    id: new UniqueEntityID().toString(),
    ownerId: new UniqueEntityID().toString(),
    name: 'Contas',
    type: 'DEFAULT',
    createdAt: new Date('2026-01-15T12:00:00.000Z'),
    updatedAt: null,
    ...override,
  }
}

describe('DrizzleAccountGroupMapper', () => {
  it('deve converter o registro do banco em entidade preservando o identificador', () => {
    const record = makeRecord()

    const accountGroup = DrizzleAccountGroupMapper.toDomain(record)

    expect(accountGroup.id.toString()).toBe(record.id)
    expect(accountGroup.ownerId.toString()).toBe(record.ownerId)
    expect(accountGroup.name).toBe(record.name)
    expect(accountGroup.type).toBe(record.type)
    expect(accountGroup.createdAt).toEqual(record.createdAt)
    expect(accountGroup.updatedAt).toBeNull()
  })

  it('deve converter o registro do banco do tipo "Cartão de Crédito" (RN015)', () => {
    const accountGroup = DrizzleAccountGroupMapper.toDomain(makeRecord({ type: 'CREDIT_CARD' }))

    expect(accountGroup.type).toBe('CREDIT_CARD')
  })

  it('deve converter o registro do banco com data de atualização preenchida', () => {
    const updatedAt = new Date('2026-02-20T12:00:00.000Z')

    const accountGroup = DrizzleAccountGroupMapper.toDomain(makeRecord({ updatedAt }))

    expect(accountGroup.updatedAt).toEqual(updatedAt)
  })

  it('deve converter a entidade em registro de persistência', () => {
    const accountGroup = makeAccountGroup()

    const record = DrizzleAccountGroupMapper.toPersistence(accountGroup)

    expect(record).toEqual({
      id: accountGroup.id.toString(),
      ownerId: accountGroup.ownerId.toString(),
      name: accountGroup.name,
      type: accountGroup.type,
      createdAt: accountGroup.createdAt,
      updatedAt: null,
    })
  })

  it('deve manter a entidade equivalente ao percorrer os dois sentidos da conversão', () => {
    const record = makeRecord()

    expect(DrizzleAccountGroupMapper.toPersistence(DrizzleAccountGroupMapper.toDomain(record))).toEqual(record)
  })
})
