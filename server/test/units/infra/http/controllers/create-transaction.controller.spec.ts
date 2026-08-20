import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { CategoryNatureMismatchError } from '@domain/transaction/application/use-cases/errors/category-nature-mismatch-error'
import { Money } from '@core/value-objects/money'
import { CreateTransactionUseCase } from '@domain/transaction/application/use-cases/create-transaction'
import { InMemoryAccountGroupsRepository } from '@infra/database/in-memory/in-memory-account-groups-repository'
import { InMemoryAccountsRepository } from '@infra/database/in-memory/in-memory-accounts-repository'
import { InMemoryCategoriesRepository } from '@infra/database/in-memory/in-memory-categories-repository'
import { InMemoryTransactionsRepository } from '@infra/database/in-memory/in-memory-transactions-repository'
import { InMemoryUsersRepository } from '@infra/database/in-memory/in-memory-users-repository'
import { CreateTransactionController } from '@infra/http/controllers/create-transaction.controller'
import { makeAccount } from '@tests/factories/make-account'
import { makeCategory } from '@tests/factories/make-category'

let transactionsRepository: InMemoryTransactionsRepository
let accountsRepository: InMemoryAccountsRepository
let categoriesRepository: InMemoryCategoriesRepository
let usersRepository: InMemoryUsersRepository
let sut: CreateTransactionController

describe('CreateTransactionController', () => {
  beforeEach(() => {
    transactionsRepository = new InMemoryTransactionsRepository()
    accountsRepository = new InMemoryAccountsRepository(new InMemoryAccountGroupsRepository(), transactionsRepository)
    categoriesRepository = new InMemoryCategoriesRepository()
    usersRepository = new InMemoryUsersRepository()
    sut = new CreateTransactionController(new CreateTransactionUseCase(transactionsRepository, accountsRepository, categoriesRepository, usersRepository))
  })

  it('deve devolver a transação criada no formato de resposta', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }
    const account = makeAccount({ ownerId: new UniqueEntityID(currentUser.id) })
    const category = makeCategory({ ownerId: new UniqueEntityID(currentUser.id), nature: 'EXPENSE' })

    await accountsRepository.create(account)
    await categoriesRepository.create(category)

    const date = new Date('2026-01-10T00:00:00.000Z')

    const response = await sut.handle(currentUser, {
      accountId: account.id.toString(),
      categoryId: category.id.toString(),
      type: 'EXPENSE',
      status: 'SETTLED',
      date,
      amount: Money.fromCents(5000),
      description: 'Supermercado',
    })

    expect(response.transaction).toEqual({
      id: transactionsRepository.items[0].id.toString(),
      accountId: account.id.toString(),
      categoryId: category.id.toString(),
      sourceAccountId: null,
      destinationAccountId: null,
      type: 'EXPENSE',
      status: 'SETTLED',
      date,
      amount: { amountInCents: 5000, formatted: '50.00' },
      description: 'Supermercado',
      createdAt: transactionsRepository.items[0].createdAt,
      updatedAt: null,
    })
  })

  it('deve persistir a transação vinculada ao usuário autenticado (RN010)', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }
    const account = makeAccount({ ownerId: new UniqueEntityID(currentUser.id) })
    const category = makeCategory({ ownerId: new UniqueEntityID(currentUser.id), nature: 'EXPENSE' })

    await accountsRepository.create(account)
    await categoriesRepository.create(category)

    await sut.handle(currentUser, {
      accountId: account.id.toString(),
      categoryId: category.id.toString(),
      type: 'EXPENSE',
      status: 'SETTLED',
      date: new Date('2026-01-10T00:00:00.000Z'),
      amount: Money.fromCents(5000),
    })

    expect(transactionsRepository.items).toHaveLength(1)
    expect(transactionsRepository.items[0].ownerId.toString()).toBe(currentUser.id)
  })

  it('deve ignorar o dono informado no corpo e vincular a transação ao usuário do token (RN010, RN011)', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }
    const account = makeAccount({ ownerId: new UniqueEntityID(currentUser.id) })
    const category = makeCategory({ ownerId: new UniqueEntityID(currentUser.id), nature: 'EXPENSE' })

    await accountsRepository.create(account)
    await categoriesRepository.create(category)

    const forgedBody = Object.assign(
      {
        accountId: account.id.toString(),
        categoryId: category.id.toString(),
        type: 'EXPENSE' as const,
        status: 'SETTLED' as const,
        date: new Date('2026-01-10T00:00:00.000Z'),
        amount: Money.fromCents(5000),
      },
      { ownerId: new UniqueEntityID().toString() },
    )

    await sut.handle(currentUser, forgedBody)

    expect(transactionsRepository.items[0].ownerId.toString()).toBe(currentUser.id)
  })

  it('deve aceitar a criação sem status informado, derivando a situação pela data (RN049)', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }
    const account = makeAccount({ ownerId: new UniqueEntityID(currentUser.id) })
    const category = makeCategory({ ownerId: new UniqueEntityID(currentUser.id), nature: 'EXPENSE' })

    await accountsRepository.create(account)
    await categoriesRepository.create(category)

    const response = await sut.handle(currentUser, {
      accountId: account.id.toString(),
      categoryId: category.id.toString(),
      type: 'EXPENSE',
      date: new Date('2000-01-10T00:00:00.000Z'),
      amount: Money.fromCents(5000),
    })

    expect(response.transaction.status).toBe('SETTLED')
  })

  it('deve lançar CategoryNatureMismatchError quando a categoria for incompatível com o tipo (RN042)', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }
    const account = makeAccount({ ownerId: new UniqueEntityID(currentUser.id) })
    const category = makeCategory({ ownerId: new UniqueEntityID(currentUser.id), nature: 'INCOME' })

    await accountsRepository.create(account)
    await categoriesRepository.create(category)

    await expect(
      sut.handle(currentUser, {
        accountId: account.id.toString(),
        categoryId: category.id.toString(),
        type: 'EXPENSE',
        status: 'SETTLED',
        date: new Date('2026-01-10T00:00:00.000Z'),
        amount: Money.fromCents(5000),
      }),
    ).rejects.toBeInstanceOf(CategoryNatureMismatchError)
  })
})
