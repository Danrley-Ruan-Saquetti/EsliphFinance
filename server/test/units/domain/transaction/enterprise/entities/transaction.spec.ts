import { describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { InvariantError } from '@core/errors/invariant-error'
import { Money } from '@core/value-objects/money'
import { Transaction } from '@domain/transaction/enterprise/entities/transaction'
import { TransactionStatus } from '@domain/transaction/enterprise/value-objects/transaction-status'
import { TransactionType } from '@domain/transaction/enterprise/value-objects/transaction-type'

describe('Transaction', () => {
  it('deve criar a transação com a data, o valor, a conta, o tipo, a situação e a categoria informados (RN040)', () => {
    const ownerId = new UniqueEntityID()
    const accountId = new UniqueEntityID()
    const categoryId = new UniqueEntityID()
    const date = new Date('2026-01-10T00:00:00.000Z')

    const transaction = Transaction.create({
      ownerId,
      accountId,
      categoryId,
      type: 'EXPENSE',
      status: 'SETTLED',
      date,
      amount: Money.fromCents(5000),
    })

    expect(transaction.ownerId).toBe(ownerId)
    expect(transaction.accountId).toBe(accountId)
    expect(transaction.categoryId).toBe(categoryId)
    expect(transaction.type).toBe('EXPENSE')
    expect(transaction.status).toBe('SETTLED')
    expect(transaction.date).toEqual(date)
    expect(transaction.amount.amountInCents).toBe(5000)
    expect(transaction.description).toBeNull()
    expect(transaction.createdAt).toBeInstanceOf(Date)
  })

  it('deve criar a transação sem descrição, por ser opcional (RN040)', () => {
    const transaction = Transaction.create({
      ownerId: new UniqueEntityID(),
      accountId: new UniqueEntityID(),
      categoryId: new UniqueEntityID(),
      type: 'INCOME',
      status: 'PLANNED',
      date: new Date(),
      amount: Money.fromCents(1000),
    })

    expect(transaction.description).toBeNull()
  })

  it('deve remover os espaços das extremidades da descrição', () => {
    const transaction = Transaction.create({
      ownerId: new UniqueEntityID(),
      accountId: new UniqueEntityID(),
      categoryId: new UniqueEntityID(),
      type: 'INCOME',
      status: 'PLANNED',
      date: new Date(),
      amount: Money.fromCents(1000),
      description: '  Salário de janeiro  ',
    })

    expect(transaction.description).toBe('Salário de janeiro')
  })

  it('deve tratar a descrição vazia como nula', () => {
    const transaction = Transaction.create({
      ownerId: new UniqueEntityID(),
      accountId: new UniqueEntityID(),
      categoryId: new UniqueEntityID(),
      type: 'INCOME',
      status: 'PLANNED',
      date: new Date(),
      amount: Money.fromCents(1000),
      description: '   ',
    })

    expect(transaction.description).toBeNull()
  })

  it.each([Transaction.INCOME_TYPE, Transaction.EXPENSE_TYPE, Transaction.TRANSFER_TYPE])(
    'deve aceitar o tipo "%s" (RN039)',
    type => {
      const categoryId = type === Transaction.TRANSFER_TYPE ? null : new UniqueEntityID()

      const transaction = Transaction.create({
        ownerId: new UniqueEntityID(),
        accountId: new UniqueEntityID(),
        categoryId,
        type,
        status: 'SETTLED',
        date: new Date(),
        amount: Money.fromCents(1000),
      })

      expect(transaction.type).toBe(type)
    },
  )

  it('deve lançar InvariantError quando o tipo estiver fora do domínio permitido (RN039)', () => {
    expect(() =>
      Transaction.create({
        ownerId: new UniqueEntityID(),
        accountId: new UniqueEntityID(),
        categoryId: new UniqueEntityID(),
        type: 'INVALID' as TransactionType,
        status: 'SETTLED',
        date: new Date(),
        amount: Money.fromCents(1000),
      }),
    ).toThrow(InvariantError)
  })

  it.each([Transaction.PLANNED_STATUS, Transaction.SETTLED_STATUS])('deve aceitar a situação "%s" (RN048)', status => {
    const transaction = Transaction.create({
      ownerId: new UniqueEntityID(),
      accountId: new UniqueEntityID(),
      categoryId: new UniqueEntityID(),
      type: 'EXPENSE',
      status,
      date: new Date(),
      amount: Money.fromCents(1000),
    })

    expect(transaction.status).toBe(status)
  })

  it('deve lançar InvariantError quando a situação estiver fora do domínio permitido (RN048)', () => {
    expect(() =>
      Transaction.create({
        ownerId: new UniqueEntityID(),
        accountId: new UniqueEntityID(),
        categoryId: new UniqueEntityID(),
        type: 'EXPENSE',
        status: 'INVALID' as TransactionStatus,
        date: new Date(),
        amount: Money.fromCents(1000),
      }),
    ).toThrow(InvariantError)
  })

  it('deve lançar InvariantError quando o valor for zero (RN041)', () => {
    expect(() =>
      Transaction.create({
        ownerId: new UniqueEntityID(),
        accountId: new UniqueEntityID(),
        categoryId: new UniqueEntityID(),
        type: 'EXPENSE',
        status: 'SETTLED',
        date: new Date(),
        amount: Money.zero(),
      }),
    ).toThrow(InvariantError)
  })

  it('deve lançar InvariantError quando o valor for negativo (RN041)', () => {
    expect(() =>
      Transaction.create({
        ownerId: new UniqueEntityID(),
        accountId: new UniqueEntityID(),
        categoryId: new UniqueEntityID(),
        type: 'EXPENSE',
        status: 'SETTLED',
        date: new Date(),
        amount: Money.fromCents(-100),
      }),
    ).toThrow(InvariantError)
  })

  it.each([Transaction.INCOME_TYPE, Transaction.EXPENSE_TYPE])(
    'deve lançar InvariantError quando a transação do tipo "%s" não informar a categoria (RN042)',
    type => {
      expect(() =>
        Transaction.create({
          ownerId: new UniqueEntityID(),
          accountId: new UniqueEntityID(),
          categoryId: null,
          type,
          status: 'SETTLED',
          date: new Date(),
          amount: Money.fromCents(1000),
        }),
      ).toThrow(InvariantError)
    },
  )

  it('deve lançar InvariantError quando a transação do tipo "Transferência" informar a categoria (RN043)', () => {
    expect(() =>
      Transaction.create({
        ownerId: new UniqueEntityID(),
        accountId: new UniqueEntityID(),
        categoryId: new UniqueEntityID(),
        type: 'TRANSFER',
        status: 'SETTLED',
        date: new Date(),
        amount: Money.fromCents(1000),
      }),
    ).toThrow(InvariantError)
  })

  it('deve preservar o identificador e as datas informadas', () => {
    const id = new UniqueEntityID()
    const createdAt = new Date('2026-01-15T12:00:00.000Z')
    const updatedAt = new Date('2026-02-20T12:00:00.000Z')

    const transaction = Transaction.create(
      {
        ownerId: new UniqueEntityID(),
        accountId: new UniqueEntityID(),
        categoryId: new UniqueEntityID(),
        type: 'EXPENSE',
        status: 'SETTLED',
        date: new Date(),
        amount: Money.fromCents(1000),
        createdAt,
        updatedAt,
      },
      id,
    )

    expect(transaction.id).toBe(id)
    expect(transaction.createdAt).toEqual(createdAt)
    expect(transaction.updatedAt).toEqual(updatedAt)
  })
})
