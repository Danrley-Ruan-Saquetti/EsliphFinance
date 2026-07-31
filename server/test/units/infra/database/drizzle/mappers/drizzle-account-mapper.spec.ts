import { describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { Money } from '@core/value-objects/money'
import { AccountRecord, DrizzleAccountMapper } from '@infra/database/drizzle/mappers/drizzle-account-mapper'
import { makeAccount } from '@tests/factories/make-account'

function makeRecord(override: Partial<AccountRecord> = {}): AccountRecord {
  return {
    id: new UniqueEntityID().toString(),
    ownerId: new UniqueEntityID().toString(),
    accountGroupId: new UniqueEntityID().toString(),
    name: 'Carteira',
    initialBalance: 15000,
    icon: 'wallet',
    color: '#1E88E5',
    createdAt: new Date('2026-01-15T12:00:00.000Z'),
    updatedAt: null,
    ...override,
  }
}

describe('DrizzleAccountMapper', () => {
  it('deve converter o registro do banco em entidade preservando o identificador', () => {
    const record = makeRecord()

    const account = DrizzleAccountMapper.toDomain(record)

    expect(account.id.toString()).toBe(record.id)
    expect(account.ownerId.toString()).toBe(record.ownerId)
    expect(account.accountGroupId.toString()).toBe(record.accountGroupId)
    expect(account.name).toBe(record.name)
    expect(account.initialBalance.amountInCents).toBe(15000)
    expect(account.icon).toBe(record.icon)
    expect(account.color).toBe(record.color)
    expect(account.createdAt).toEqual(record.createdAt)
    expect(account.updatedAt).toBeNull()
  })

  it('deve converter o registro do banco com saldo inicial negativo (RNF004)', () => {
    const account = DrizzleAccountMapper.toDomain(makeRecord({ initialBalance: -25050 }))

    expect(account.initialBalance.amountInCents).toBe(-25050)
  })

  it('deve converter o registro do banco com data de atualização preenchida', () => {
    const updatedAt = new Date('2026-02-20T12:00:00.000Z')

    const account = DrizzleAccountMapper.toDomain(makeRecord({ updatedAt }))

    expect(account.updatedAt).toEqual(updatedAt)
  })

  it('deve converter a entidade em registro de persistência com o saldo inicial em centavos (RNF004)', () => {
    const account = makeAccount({ initialBalance: Money.fromCents(15000) })

    const record = DrizzleAccountMapper.toPersistence(account)

    expect(record).toEqual({
      id: account.id.toString(),
      ownerId: account.ownerId.toString(),
      accountGroupId: account.accountGroupId.toString(),
      name: account.name,
      initialBalance: 15000,
      icon: account.icon,
      color: account.color,
      createdAt: account.createdAt,
      updatedAt: null,
    })
  })

  it('deve manter a entidade equivalente ao percorrer os dois sentidos da conversão', () => {
    const record = makeRecord()

    expect(DrizzleAccountMapper.toPersistence(DrizzleAccountMapper.toDomain(record))).toEqual(record)
  })
})
