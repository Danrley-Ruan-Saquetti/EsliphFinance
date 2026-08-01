import { describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { Money } from '@core/value-objects/money'
import { CreditCardSettings } from '@domain/account/enterprise/value-objects/credit-card-settings'
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
    creditLimit: null,
    closingDay: null,
    dueDay: null,
    createdAt: new Date('2026-01-15T12:00:00.000Z'),
    updatedAt: null,
    archivedAt: null,
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
    expect(account.creditCard).toBeNull()
    expect(account.createdAt).toEqual(record.createdAt)
    expect(account.updatedAt).toBeNull()
    expect(account.archivedAt).toBeNull()
  })

  it('deve converter o registro do banco da conta de cartão de crédito (RN019)', () => {
    const account = DrizzleAccountMapper.toDomain(makeRecord({ initialBalance: 0, creditLimit: 500000, closingDay: 20, dueDay: 28 }))

    expect(account.creditCard?.limit.amountInCents).toBe(500000)
    expect(account.creditCard?.closingDay.day).toBe(20)
    expect(account.creditCard?.dueDay.day).toBe(28)
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

  it('deve converter o registro do banco com data de arquivamento preenchida (RN024)', () => {
    const archivedAt = new Date('2026-03-10T12:00:00.000Z')

    const account = DrizzleAccountMapper.toDomain(makeRecord({ archivedAt }))

    expect(account.archivedAt).toEqual(archivedAt)
    expect(account.isArchived).toBe(true)
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
      creditLimit: null,
      closingDay: null,
      dueDay: null,
      createdAt: account.createdAt,
      updatedAt: null,
      archivedAt: null,
    })
  })

  it('deve converter a entidade da conta de cartão de crédito em registro de persistência (RN019)', () => {
    const creditCard = CreditCardSettings.create({ limit: Money.fromCents(500000), closingDay: 20, dueDay: 28 })
    const account = makeAccount({ creditCard })

    const record = DrizzleAccountMapper.toPersistence(account)

    expect(record.creditLimit).toBe(500000)
    expect(record.closingDay).toBe(20)
    expect(record.dueDay).toBe(28)
  })

  it('deve manter a entidade equivalente ao percorrer os dois sentidos da conversão', () => {
    const record = makeRecord()

    expect(DrizzleAccountMapper.toPersistence(DrizzleAccountMapper.toDomain(record))).toEqual(record)
  })

  it('deve manter a conta de cartão de crédito equivalente ao percorrer os dois sentidos da conversão (RN019)', () => {
    const record = makeRecord({ initialBalance: 0, creditLimit: 500000, closingDay: 20, dueDay: 28 })

    expect(DrizzleAccountMapper.toPersistence(DrizzleAccountMapper.toDomain(record))).toEqual(record)
  })
})
