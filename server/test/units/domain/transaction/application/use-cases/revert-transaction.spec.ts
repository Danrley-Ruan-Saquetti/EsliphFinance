import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { RevertTransactionUseCase } from '@domain/transaction/application/use-cases/revert-transaction'
import { TransactionStatusConflictError } from '@domain/transaction/application/use-cases/errors/transaction-status-conflict-error'
import { InMemoryTransactionsRepository } from '@infra/database/in-memory/in-memory-transactions-repository'
import { makeTransaction } from '@tests/factories/make-transaction'

let transactionsRepository: InMemoryTransactionsRepository
let sut: RevertTransactionUseCase

describe('Reverter transação', () => {
  beforeEach(() => {
    transactionsRepository = new InMemoryTransactionsRepository()
    sut = new RevertTransactionUseCase(transactionsRepository)
  })

  it('deve reverter a transação efetivada do usuário para prevista (RN048)', async () => {
    const ownerId = new UniqueEntityID()
    const transaction = makeTransaction({ ownerId, status: 'SETTLED' })

    await transactionsRepository.create(transaction)

    const result = await sut.execute({ ownerId: ownerId.toString(), transactionId: transaction.id.toString() })

    expect(result.isRight()).toBe(true)
    expect(transactionsRepository.items[0].status).toBe('PLANNED')
  })

  it('deve rejeitar quando a transação já estiver prevista (RN087)', async () => {
    const ownerId = new UniqueEntityID()
    const transaction = makeTransaction({ ownerId, status: 'PLANNED' })

    await transactionsRepository.create(transaction)

    const result = await sut.execute({ ownerId: ownerId.toString(), transactionId: transaction.id.toString() })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(TransactionStatusConflictError)
    expect(transactionsRepository.items[0].status).toBe('PLANNED')
  })

  it('deve rejeitar quando a transação não existir', async () => {
    const result = await sut.execute({ ownerId: new UniqueEntityID().toString(), transactionId: new UniqueEntityID().toString() })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })

  it('deve tratar a transação de outro usuário como inexistente (RN010, RN011)', async () => {
    const transaction = makeTransaction({ ownerId: new UniqueEntityID(), status: 'SETTLED' })

    await transactionsRepository.create(transaction)

    const result = await sut.execute({ ownerId: new UniqueEntityID().toString(), transactionId: transaction.id.toString() })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
    expect(transactionsRepository.items[0].status).toBe('SETTLED')
  })
})
