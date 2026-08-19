import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { SettleTransactionUseCase } from '@domain/transaction/application/use-cases/settle-transaction'
import { TransactionStatusConflictError } from '@domain/transaction/application/use-cases/errors/transaction-status-conflict-error'
import { InMemoryTransactionsRepository } from '@infra/database/in-memory/in-memory-transactions-repository'
import { SettleTransactionController } from '@infra/http/controllers/settle-transaction.controller'
import { makeTransaction } from '@tests/factories/make-transaction'

let transactionsRepository: InMemoryTransactionsRepository
let sut: SettleTransactionController

describe('SettleTransactionController', () => {
  beforeEach(() => {
    transactionsRepository = new InMemoryTransactionsRepository()
    sut = new SettleTransactionController(new SettleTransactionUseCase(transactionsRepository))
  })

  it('deve devolver a transação efetivada no formato de resposta', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }
    const transaction = makeTransaction({ ownerId: new UniqueEntityID(currentUser.id), status: 'PLANNED' })

    await transactionsRepository.create(transaction)

    const response = await sut.handle(currentUser, { id: transaction.id.toString() }, {})

    expect(response.transaction.status).toBe('SETTLED')
  })

  it('deve repassar a data de efetivação informada no corpo (RN088)', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }
    const transaction = makeTransaction({ ownerId: new UniqueEntityID(currentUser.id), status: 'PLANNED', date: new Date('2026-01-10T00:00:00.000Z') })

    await transactionsRepository.create(transaction)

    const settledAtDate = new Date('2026-01-12T00:00:00.000Z')

    const response = await sut.handle(currentUser, { id: transaction.id.toString() }, { date: settledAtDate })

    expect(response.transaction.date).toEqual(settledAtDate)
  })

  it('deve lançar TransactionStatusConflictError quando a transação já estiver efetivada (RN086)', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }
    const transaction = makeTransaction({ ownerId: new UniqueEntityID(currentUser.id), status: 'SETTLED' })

    await transactionsRepository.create(transaction)

    await expect(sut.handle(currentUser, { id: transaction.id.toString() }, {})).rejects.toBeInstanceOf(TransactionStatusConflictError)
  })
})
