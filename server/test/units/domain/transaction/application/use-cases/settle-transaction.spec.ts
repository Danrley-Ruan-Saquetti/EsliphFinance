import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { SettleTransactionUseCase } from '@domain/transaction/application/use-cases/settle-transaction'
import { TransactionStatusConflictError } from '@domain/transaction/application/use-cases/errors/transaction-status-conflict-error'
import { InMemoryTransactionsRepository } from '@infra/database/in-memory/in-memory-transactions-repository'
import { makeTransaction } from '@tests/factories/make-transaction'

let transactionsRepository: InMemoryTransactionsRepository
let sut: SettleTransactionUseCase

describe('Efetivar transação', () => {
  beforeEach(() => {
    transactionsRepository = new InMemoryTransactionsRepository()
    sut = new SettleTransactionUseCase(transactionsRepository)
  })

  it('deve efetivar a transação prevista do usuário (RN048)', async () => {
    const ownerId = new UniqueEntityID()
    const transaction = makeTransaction({ ownerId, status: 'PLANNED' })

    await transactionsRepository.create(transaction)

    const result = await sut.execute({ ownerId: ownerId.toString(), transactionId: transaction.id.toString() })

    expect(result.isRight()).toBe(true)
    expect(transactionsRepository.items[0].status).toBe('SETTLED')
  })

  it('deve atualizar a data da transação quando a data de efetivação for informada (RN088)', async () => {
    const ownerId = new UniqueEntityID()
    const transaction = makeTransaction({ ownerId, status: 'PLANNED', date: new Date('2026-01-10T00:00:00.000Z') })

    await transactionsRepository.create(transaction)

    const settledAtDate = new Date('2026-01-12T00:00:00.000Z')

    const result = await sut.execute({ ownerId: ownerId.toString(), transactionId: transaction.id.toString(), date: settledAtDate })

    expect(result.isRight()).toBe(true)
    expect(transactionsRepository.items[0].date).toEqual(settledAtDate)
  })

  it('deve manter a data original quando a data de efetivação não for informada (RN088)', async () => {
    const ownerId = new UniqueEntityID()
    const originalDate = new Date('2026-01-10T00:00:00.000Z')
    const transaction = makeTransaction({ ownerId, status: 'PLANNED', date: originalDate })

    await transactionsRepository.create(transaction)

    const result = await sut.execute({ ownerId: ownerId.toString(), transactionId: transaction.id.toString() })

    expect(result.isRight()).toBe(true)
    expect(transactionsRepository.items[0].date).toEqual(originalDate)
  })

  it('deve rejeitar quando a transação já estiver efetivada (RN086)', async () => {
    const ownerId = new UniqueEntityID()
    const transaction = makeTransaction({ ownerId, status: 'SETTLED' })

    await transactionsRepository.create(transaction)

    const result = await sut.execute({ ownerId: ownerId.toString(), transactionId: transaction.id.toString() })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(TransactionStatusConflictError)
    expect(transactionsRepository.items[0].status).toBe('SETTLED')
  })

  it('deve rejeitar quando a transação não existir', async () => {
    const result = await sut.execute({ ownerId: new UniqueEntityID().toString(), transactionId: new UniqueEntityID().toString() })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })

  it('deve tratar a transação de outro usuário como inexistente (RN010, RN011)', async () => {
    const transaction = makeTransaction({ ownerId: new UniqueEntityID(), status: 'PLANNED' })

    await transactionsRepository.create(transaction)

    const result = await sut.execute({ ownerId: new UniqueEntityID().toString(), transactionId: transaction.id.toString() })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
    expect(transactionsRepository.items[0].status).toBe('PLANNED')
  })
})
