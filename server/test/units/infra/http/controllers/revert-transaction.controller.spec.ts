import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { RevertTransactionUseCase } from '@domain/transaction/application/use-cases/revert-transaction'
import { TransactionStatusConflictError } from '@domain/transaction/application/use-cases/errors/transaction-status-conflict-error'
import { InMemoryTransactionsRepository } from '@infra/database/in-memory/in-memory-transactions-repository'
import { RevertTransactionController } from '@infra/http/controllers/revert-transaction.controller'
import { makeTransaction } from '@tests/factories/make-transaction'

let transactionsRepository: InMemoryTransactionsRepository
let sut: RevertTransactionController

describe('RevertTransactionController', () => {
  beforeEach(() => {
    transactionsRepository = new InMemoryTransactionsRepository()
    sut = new RevertTransactionController(new RevertTransactionUseCase(transactionsRepository))
  })

  it('deve devolver a transação revertida no formato de resposta', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }
    const transaction = makeTransaction({ ownerId: new UniqueEntityID(currentUser.id), status: 'SETTLED' })

    await transactionsRepository.create(transaction)

    const response = await sut.handle(currentUser, { id: transaction.id.toString() })

    expect(response.transaction.status).toBe('PLANNED')
  })

  it('deve lançar TransactionStatusConflictError quando a transação já estiver prevista (RN087)', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }
    const transaction = makeTransaction({ ownerId: new UniqueEntityID(currentUser.id), status: 'PLANNED' })

    await transactionsRepository.create(transaction)

    await expect(sut.handle(currentUser, { id: transaction.id.toString() })).rejects.toBeInstanceOf(TransactionStatusConflictError)
  })
})
