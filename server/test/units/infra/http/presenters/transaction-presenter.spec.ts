import { describe, expect, it } from 'vitest'

import { TransactionPresenter } from '@infra/http/presenters/transaction-presenter'
import { makeTransaction } from '@tests/factories/make-transaction'

describe('TransactionPresenter', () => {
  it('deve expor a transação com o identificador em texto e o valor formatado', () => {
    const transaction = makeTransaction({ description: 'Supermercado' })

    const result = TransactionPresenter.toHTTP(transaction)

    expect(result).toEqual({
      id: transaction.id.toString(),
      accountId: transaction.accountId.toString(),
      categoryId: transaction.categoryId?.toString() ?? null,
      type: transaction.type,
      status: transaction.status,
      date: transaction.date,
      amount: { amountInCents: transaction.amount.amountInCents, formatted: transaction.amount.toString() },
      description: 'Supermercado',
      createdAt: transaction.createdAt,
      updatedAt: null,
    })
  })

  it('deve expor a data de atualização quando a transação já foi alterada', () => {
    const updatedAt = new Date('2026-02-20T12:00:00.000Z')
    const transaction = makeTransaction({ updatedAt })

    expect(TransactionPresenter.toHTTP(transaction).updatedAt).toEqual(updatedAt)
  })
})
