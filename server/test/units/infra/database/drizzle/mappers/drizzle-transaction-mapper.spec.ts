import { describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { DrizzleTransactionMapper, TransactionRecord } from '@infra/database/drizzle/mappers/drizzle-transaction-mapper'
import { makeTransaction } from '@tests/factories/make-transaction'

function makeRecord(override: Partial<TransactionRecord> = {}): TransactionRecord {
  return {
    id: new UniqueEntityID().toString(),
    ownerId: new UniqueEntityID().toString(),
    accountId: new UniqueEntityID().toString(),
    categoryId: new UniqueEntityID().toString(),
    sourceAccountId: null,
    destinationAccountId: null,
    type: 'EXPENSE',
    status: 'SETTLED',
    date: new Date('2026-01-10T00:00:00.000Z'),
    amount: 5000,
    description: 'Supermercado',
    createdAt: new Date('2026-01-15T12:00:00.000Z'),
    updatedAt: null,
    ...override,
  }
}

describe('DrizzleTransactionMapper', () => {
  it('deve converter o registro do banco em entidade preservando o identificador', () => {
    const record = makeRecord()

    const transaction = DrizzleTransactionMapper.toDomain(record)

    expect(transaction.id.toString()).toBe(record.id)
    expect(transaction.ownerId.toString()).toBe(record.ownerId)
    expect(transaction.accountId?.toString()).toBe(record.accountId)
    expect(transaction.categoryId?.toString()).toBe(record.categoryId)
    expect(transaction.type).toBe(record.type)
    expect(transaction.status).toBe(record.status)
    expect(transaction.date).toEqual(record.date)
    expect(transaction.amount.amountInCents).toBe(record.amount)
    expect(transaction.description).toBe(record.description)
    expect(transaction.createdAt).toEqual(record.createdAt)
    expect(transaction.updatedAt).toBeNull()
  })

  it('deve converter o registro do banco sem categoria (RN043)', () => {
    const transaction = DrizzleTransactionMapper.toDomain(
      makeRecord({
        accountId: null,
        categoryId: null,
        sourceAccountId: new UniqueEntityID().toString(),
        destinationAccountId: new UniqueEntityID().toString(),
        type: 'TRANSFER',
      }),
    )

    expect(transaction.categoryId).toBeNull()
  })

  it('deve converter o registro do banco de transferência com conta de origem e conta de destino (RN044)', () => {
    const sourceAccountId = new UniqueEntityID().toString()
    const destinationAccountId = new UniqueEntityID().toString()

    const transaction = DrizzleTransactionMapper.toDomain(
      makeRecord({ accountId: null, categoryId: null, sourceAccountId, destinationAccountId, type: 'TRANSFER' }),
    )

    expect(transaction.accountId).toBeNull()
    expect(transaction.sourceAccountId?.toString()).toBe(sourceAccountId)
    expect(transaction.destinationAccountId?.toString()).toBe(destinationAccountId)
  })

  it('deve converter o registro do banco com data de atualização preenchida', () => {
    const updatedAt = new Date('2026-02-20T12:00:00.000Z')

    const transaction = DrizzleTransactionMapper.toDomain(makeRecord({ updatedAt }))

    expect(transaction.updatedAt).toEqual(updatedAt)
  })

  it('deve converter a entidade em registro de persistência', () => {
    const transaction = makeTransaction()

    const record = DrizzleTransactionMapper.toPersistence(transaction)

    expect(record).toEqual({
      id: transaction.id.toString(),
      ownerId: transaction.ownerId.toString(),
      accountId: transaction.accountId?.toString() ?? null,
      categoryId: transaction.categoryId?.toString() ?? null,
      sourceAccountId: transaction.sourceAccountId?.toString() ?? null,
      destinationAccountId: transaction.destinationAccountId?.toString() ?? null,
      type: transaction.type,
      status: transaction.status,
      date: transaction.date,
      amount: transaction.amount.amountInCents,
      description: transaction.description,
      createdAt: transaction.createdAt,
      updatedAt: null,
    })
  })

  it('deve manter a entidade equivalente ao percorrer os dois sentidos da conversão', () => {
    const record = makeRecord()

    expect(DrizzleTransactionMapper.toPersistence(DrizzleTransactionMapper.toDomain(record))).toEqual(record)
  })
})
