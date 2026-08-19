import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { InvariantError } from '@core/errors/invariant-error'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { Money } from '@core/value-objects/money'
import { CategoryNature } from '@domain/category/enterprise/value-objects/category-nature'
import { CategoryNatureMismatchError } from '@domain/transaction/application/use-cases/errors/category-nature-mismatch-error'
import { ResourceArchivedError } from '@domain/transaction/application/use-cases/errors/resource-archived-error'
import { CreateTransactionUseCase } from '@domain/transaction/application/use-cases/create-transaction'
import { InMemoryAccountGroupsRepository } from '@infra/database/in-memory/in-memory-account-groups-repository'
import { InMemoryAccountsRepository } from '@infra/database/in-memory/in-memory-accounts-repository'
import { InMemoryCategoriesRepository } from '@infra/database/in-memory/in-memory-categories-repository'
import { InMemoryTransactionsRepository } from '@infra/database/in-memory/in-memory-transactions-repository'
import { InMemoryUsersRepository } from '@infra/database/in-memory/in-memory-users-repository'
import { makeAccount } from '@tests/factories/make-account'
import { makeCategory } from '@tests/factories/make-category'
import { makeUser } from '@tests/factories/make-user'

let transactionsRepository: InMemoryTransactionsRepository
let accountsRepository: InMemoryAccountsRepository
let accountGroupsRepository: InMemoryAccountGroupsRepository
let categoriesRepository: InMemoryCategoriesRepository
let usersRepository: InMemoryUsersRepository
let sut: CreateTransactionUseCase

describe('Registrar transação', () => {
  beforeEach(() => {
    transactionsRepository = new InMemoryTransactionsRepository()
    accountGroupsRepository = new InMemoryAccountGroupsRepository()
    accountsRepository = new InMemoryAccountsRepository(accountGroupsRepository)
    categoriesRepository = new InMemoryCategoriesRepository()
    usersRepository = new InMemoryUsersRepository()
    sut = new CreateTransactionUseCase(transactionsRepository, accountsRepository, categoriesRepository, usersRepository)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('deve registrar a transação de despesa e persisti-la no repositório (RN039, RN040)', async () => {
    const ownerId = new UniqueEntityID().toString()
    const account = makeAccount({ ownerId: new UniqueEntityID(ownerId) })
    const category = makeCategory({ ownerId: new UniqueEntityID(ownerId), nature: 'EXPENSE' })

    await accountsRepository.create(account)
    await categoriesRepository.create(category)

    const date = new Date('2026-01-10T00:00:00.000Z')

    const result = await sut.execute({
      ownerId,
      accountId: account.id.toString(),
      categoryId: category.id.toString(),
      type: 'EXPENSE',
      status: 'SETTLED',
      date,
      amount: Money.fromCents(5000),
      description: 'Supermercado',
    })

    expect(result.isRight()).toBe(true)
    expect(transactionsRepository.items).toHaveLength(1)
    expect(transactionsRepository.items[0].type).toBe('EXPENSE')
    expect(transactionsRepository.items[0].amount.amountInCents).toBe(5000)
    expect(transactionsRepository.items[0].description).toBe('Supermercado')
  })

  it('deve registrar a transação de receita (RN039)', async () => {
    const ownerId = new UniqueEntityID().toString()
    const account = makeAccount({ ownerId: new UniqueEntityID(ownerId) })
    const category = makeCategory({ ownerId: new UniqueEntityID(ownerId), nature: 'INCOME' })

    await accountsRepository.create(account)
    await categoriesRepository.create(category)

    const result = await sut.execute({
      ownerId,
      accountId: account.id.toString(),
      categoryId: category.id.toString(),
      type: 'INCOME',
      status: 'SETTLED',
      date: new Date(),
      amount: Money.fromCents(300000),
    })

    expect(result.isRight()).toBe(true)
    expect(transactionsRepository.items[0].type).toBe('INCOME')
  })

  it('deve vincular a transação ao usuário informado (RN010)', async () => {
    const ownerId = new UniqueEntityID().toString()
    const account = makeAccount({ ownerId: new UniqueEntityID(ownerId) })
    const category = makeCategory({ ownerId: new UniqueEntityID(ownerId), nature: 'EXPENSE' })

    await accountsRepository.create(account)
    await categoriesRepository.create(category)

    await sut.execute({
      ownerId,
      accountId: account.id.toString(),
      categoryId: category.id.toString(),
      type: 'EXPENSE',
      status: 'SETTLED',
      date: new Date(),
      amount: Money.fromCents(1000),
    })

    expect(transactionsRepository.items[0].ownerId.toString()).toBe(ownerId)
  })

  it('deve devolver ResourceNotFoundError quando a conta não existir (RN040)', async () => {
    const ownerId = new UniqueEntityID().toString()
    const category = makeCategory({ ownerId: new UniqueEntityID(ownerId), nature: 'EXPENSE' })

    await categoriesRepository.create(category)

    const result = await sut.execute({
      ownerId,
      accountId: new UniqueEntityID().toString(),
      categoryId: category.id.toString(),
      type: 'EXPENSE',
      status: 'SETTLED',
      date: new Date(),
      amount: Money.fromCents(1000),
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
    expect(transactionsRepository.items).toHaveLength(0)
  })

  it('deve tratar a conta de outro usuário como inexistente (RN010, RN011)', async () => {
    const ownerId = new UniqueEntityID().toString()
    const account = makeAccount({ ownerId: new UniqueEntityID() })
    const category = makeCategory({ ownerId: new UniqueEntityID(ownerId), nature: 'EXPENSE' })

    await accountsRepository.create(account)
    await categoriesRepository.create(category)

    const result = await sut.execute({
      ownerId,
      accountId: account.id.toString(),
      categoryId: category.id.toString(),
      type: 'EXPENSE',
      status: 'SETTLED',
      date: new Date(),
      amount: Money.fromCents(1000),
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })

  it('deve rejeitar quando a conta estiver arquivada (RN025)', async () => {
    const ownerId = new UniqueEntityID().toString()
    const account = makeAccount({ ownerId: new UniqueEntityID(ownerId) })

    account.archive()
    const category = makeCategory({ ownerId: new UniqueEntityID(ownerId), nature: 'EXPENSE' })

    await accountsRepository.create(account)
    await categoriesRepository.create(category)

    const result = await sut.execute({
      ownerId,
      accountId: account.id.toString(),
      categoryId: category.id.toString(),
      type: 'EXPENSE',
      status: 'SETTLED',
      date: new Date(),
      amount: Money.fromCents(1000),
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceArchivedError)
  })

  it('deve devolver ResourceNotFoundError quando a categoria não existir (RN042)', async () => {
    const ownerId = new UniqueEntityID().toString()
    const account = makeAccount({ ownerId: new UniqueEntityID(ownerId) })

    await accountsRepository.create(account)

    const result = await sut.execute({
      ownerId,
      accountId: account.id.toString(),
      categoryId: new UniqueEntityID().toString(),
      type: 'EXPENSE',
      status: 'SETTLED',
      date: new Date(),
      amount: Money.fromCents(1000),
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })

  it('deve tratar a categoria de outro usuário como inexistente (RN010, RN011)', async () => {
    const ownerId = new UniqueEntityID().toString()
    const account = makeAccount({ ownerId: new UniqueEntityID(ownerId) })
    const category = makeCategory({ ownerId: new UniqueEntityID(), nature: 'EXPENSE' })

    await accountsRepository.create(account)
    await categoriesRepository.create(category)

    const result = await sut.execute({
      ownerId,
      accountId: account.id.toString(),
      categoryId: category.id.toString(),
      type: 'EXPENSE',
      status: 'SETTLED',
      date: new Date(),
      amount: Money.fromCents(1000),
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })

  it('deve rejeitar quando a categoria estiver arquivada (RN035)', async () => {
    const ownerId = new UniqueEntityID().toString()
    const account = makeAccount({ ownerId: new UniqueEntityID(ownerId) })
    const category = makeCategory({ ownerId: new UniqueEntityID(ownerId), nature: 'EXPENSE' })

    category.archive()
    await accountsRepository.create(account)
    await categoriesRepository.create(category)

    const result = await sut.execute({
      ownerId,
      accountId: account.id.toString(),
      categoryId: category.id.toString(),
      type: 'EXPENSE',
      status: 'SETTLED',
      date: new Date(),
      amount: Money.fromCents(1000),
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceArchivedError)
  })

  it('deve rejeitar categoria de natureza "Receita" em transação de despesa (RN042)', async () => {
    const ownerId = new UniqueEntityID().toString()
    const account = makeAccount({ ownerId: new UniqueEntityID(ownerId) })
    const category = makeCategory({ ownerId: new UniqueEntityID(ownerId), nature: 'INCOME' })

    await accountsRepository.create(account)
    await categoriesRepository.create(category)

    const result = await sut.execute({
      ownerId,
      accountId: account.id.toString(),
      categoryId: category.id.toString(),
      type: 'EXPENSE',
      status: 'SETTLED',
      date: new Date(),
      amount: Money.fromCents(1000),
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(CategoryNatureMismatchError)
  })

  it('deve rejeitar categoria de natureza "Despesa" em transação de receita (RN042)', async () => {
    const ownerId = new UniqueEntityID().toString()
    const account = makeAccount({ ownerId: new UniqueEntityID(ownerId) })
    const category = makeCategory({ ownerId: new UniqueEntityID(ownerId), nature: 'EXPENSE' })

    await accountsRepository.create(account)
    await categoriesRepository.create(category)

    const result = await sut.execute({
      ownerId,
      accountId: account.id.toString(),
      categoryId: category.id.toString(),
      type: 'INCOME',
      status: 'SETTLED',
      date: new Date(),
      amount: Money.fromCents(1000),
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(CategoryNatureMismatchError)
  })

  it.each(['INCOME', 'EXPENSE'] as const)('deve aceitar categoria de natureza "Ambas" em transação do tipo "%s" (RN042)', async type => {
    const ownerId = new UniqueEntityID().toString()
    const account = makeAccount({ ownerId: new UniqueEntityID(ownerId) })
    const category = makeCategory({ ownerId: new UniqueEntityID(ownerId), nature: 'BOTH' as CategoryNature })

    await accountsRepository.create(account)
    await categoriesRepository.create(category)

    const result = await sut.execute({
      ownerId,
      accountId: account.id.toString(),
      categoryId: category.id.toString(),
      type,
      status: 'SETTLED',
      date: new Date(),
      amount: Money.fromCents(1000),
    })

    expect(result.isRight()).toBe(true)
  })

  it('deve lançar InvariantError quando o valor for menor ou igual a zero (RN041)', async () => {
    const ownerId = new UniqueEntityID().toString()
    const account = makeAccount({ ownerId: new UniqueEntityID(ownerId) })
    const category = makeCategory({ ownerId: new UniqueEntityID(ownerId), nature: 'EXPENSE' })

    await accountsRepository.create(account)
    await categoriesRepository.create(category)

    await expect(
      sut.execute({
        ownerId,
        accountId: account.id.toString(),
        categoryId: category.id.toString(),
        type: 'EXPENSE',
        status: 'SETTLED',
        date: new Date(),
        amount: Money.zero(),
      }),
    ).rejects.toThrow(InvariantError)

    expect(transactionsRepository.items).toHaveLength(0)
  })

  describe('situação padrão (RN049)', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-06-15T12:00:00.000Z'))
    })

    it('deve criar a transação como "Prevista" quando a data é futura e não há status nem preferência informados (RN049)', async () => {
      const ownerId = new UniqueEntityID().toString()
      const account = makeAccount({ ownerId: new UniqueEntityID(ownerId) })
      const category = makeCategory({ ownerId: new UniqueEntityID(ownerId), nature: 'EXPENSE' })

      await accountsRepository.create(account)
      await categoriesRepository.create(category)

      const result = await sut.execute({
        ownerId,
        accountId: account.id.toString(),
        categoryId: category.id.toString(),
        type: 'EXPENSE',
        date: new Date('2026-06-16T00:00:00.000Z'),
        amount: Money.fromCents(1000),
      })

      expect(result.isRight()).toBe(true)
      expect(transactionsRepository.items[0].status).toBe('PLANNED')
    })

    it('deve criar a transação como "Efetivada" quando a data é hoje e não há status nem preferência informados (RN049)', async () => {
      const ownerId = new UniqueEntityID().toString()
      const account = makeAccount({ ownerId: new UniqueEntityID(ownerId) })
      const category = makeCategory({ ownerId: new UniqueEntityID(ownerId), nature: 'EXPENSE' })

      await accountsRepository.create(account)
      await categoriesRepository.create(category)

      const result = await sut.execute({
        ownerId,
        accountId: account.id.toString(),
        categoryId: category.id.toString(),
        type: 'EXPENSE',
        date: new Date('2026-06-15T23:59:00.000Z'),
        amount: Money.fromCents(1000),
      })

      expect(result.isRight()).toBe(true)
      expect(transactionsRepository.items[0].status).toBe('SETTLED')
    })

    it('deve criar a transação como "Efetivada" quando a data é anterior a hoje e não há status nem preferência informados (RN049)', async () => {
      const ownerId = new UniqueEntityID().toString()
      const account = makeAccount({ ownerId: new UniqueEntityID(ownerId) })
      const category = makeCategory({ ownerId: new UniqueEntityID(ownerId), nature: 'EXPENSE' })

      await accountsRepository.create(account)
      await categoriesRepository.create(category)

      const result = await sut.execute({
        ownerId,
        accountId: account.id.toString(),
        categoryId: category.id.toString(),
        type: 'EXPENSE',
        date: new Date('2026-06-14T00:00:00.000Z'),
        amount: Money.fromCents(1000),
      })

      expect(result.isRight()).toBe(true)
      expect(transactionsRepository.items[0].status).toBe('SETTLED')
    })

    it('deve usar a preferência do usuário para efetivar uma transação de data futura quando o status não é informado (RN049)', async () => {
      const owner = makeUser({ defaultTransactionStatus: 'SETTLED' })
      const account = makeAccount({ ownerId: owner.id })
      const category = makeCategory({ ownerId: owner.id, nature: 'EXPENSE' })

      await usersRepository.create(owner)
      await accountsRepository.create(account)
      await categoriesRepository.create(category)

      const result = await sut.execute({
        ownerId: owner.id.toString(),
        accountId: account.id.toString(),
        categoryId: category.id.toString(),
        type: 'EXPENSE',
        date: new Date('2026-06-16T00:00:00.000Z'),
        amount: Money.fromCents(1000),
      })

      expect(result.isRight()).toBe(true)
      expect(transactionsRepository.items[0].status).toBe('SETTLED')
    })

    it('deve usar a preferência do usuário para prever uma transação de data passada quando o status não é informado (RN049)', async () => {
      const owner = makeUser({ defaultTransactionStatus: 'PLANNED' })
      const account = makeAccount({ ownerId: owner.id })
      const category = makeCategory({ ownerId: owner.id, nature: 'EXPENSE' })

      await usersRepository.create(owner)
      await accountsRepository.create(account)
      await categoriesRepository.create(category)

      const result = await sut.execute({
        ownerId: owner.id.toString(),
        accountId: account.id.toString(),
        categoryId: category.id.toString(),
        type: 'EXPENSE',
        date: new Date('2026-06-14T00:00:00.000Z'),
        amount: Money.fromCents(1000),
      })

      expect(result.isRight()).toBe(true)
      expect(transactionsRepository.items[0].status).toBe('PLANNED')
    })

    it('deve usar o status informado explicitamente mesmo quando diverge da preferência do usuário e da data (RN049)', async () => {
      const owner = makeUser({ defaultTransactionStatus: 'SETTLED' })
      const account = makeAccount({ ownerId: owner.id })
      const category = makeCategory({ ownerId: owner.id, nature: 'EXPENSE' })

      await usersRepository.create(owner)
      await accountsRepository.create(account)
      await categoriesRepository.create(category)

      const result = await sut.execute({
        ownerId: owner.id.toString(),
        accountId: account.id.toString(),
        categoryId: category.id.toString(),
        type: 'EXPENSE',
        status: 'PLANNED',
        date: new Date('2026-06-14T00:00:00.000Z'),
        amount: Money.fromCents(1000),
      })

      expect(result.isRight()).toBe(true)
      expect(transactionsRepository.items[0].status).toBe('PLANNED')
    })
  })
})
