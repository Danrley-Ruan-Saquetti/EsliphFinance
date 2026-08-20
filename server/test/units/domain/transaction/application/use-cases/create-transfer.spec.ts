import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { Money } from '@core/value-objects/money'
import { CreateTransferUseCase } from '@domain/transaction/application/use-cases/create-transfer'
import { InvalidTransferAccountError } from '@domain/transaction/application/use-cases/errors/invalid-transfer-account-error'
import { ResourceArchivedError } from '@domain/transaction/application/use-cases/errors/resource-archived-error'
import { InMemoryAccountGroupsRepository } from '@infra/database/in-memory/in-memory-account-groups-repository'
import { InMemoryAccountsRepository } from '@infra/database/in-memory/in-memory-accounts-repository'
import { InMemoryTransactionsRepository } from '@infra/database/in-memory/in-memory-transactions-repository'
import { InMemoryUsersRepository } from '@infra/database/in-memory/in-memory-users-repository'
import { makeAccount } from '@tests/factories/make-account'
import { makeAccountGroup } from '@tests/factories/make-account-group'
import { makeUser } from '@tests/factories/make-user'

let transactionsRepository: InMemoryTransactionsRepository
let accountsRepository: InMemoryAccountsRepository
let accountGroupsRepository: InMemoryAccountGroupsRepository
let usersRepository: InMemoryUsersRepository
let sut: CreateTransferUseCase

describe('Registrar transferência entre contas', () => {
  beforeEach(() => {
    transactionsRepository = new InMemoryTransactionsRepository()
    accountGroupsRepository = new InMemoryAccountGroupsRepository()
    accountsRepository = new InMemoryAccountsRepository(accountGroupsRepository, transactionsRepository)
    usersRepository = new InMemoryUsersRepository()
    sut = new CreateTransferUseCase(transactionsRepository, accountsRepository, accountGroupsRepository, usersRepository)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('deve registrar a transferência sem categoria, vinculando a conta de origem e a conta de destino (RN043, RN044)', async () => {
    const ownerId = new UniqueEntityID().toString()
    const accountGroup = makeAccountGroup({ ownerId: new UniqueEntityID(ownerId) })
    const source = makeAccount({ ownerId: new UniqueEntityID(ownerId), accountGroupId: accountGroup.id })
    const destination = makeAccount({ ownerId: new UniqueEntityID(ownerId), accountGroupId: accountGroup.id })

    await accountGroupsRepository.create(accountGroup)
    await accountsRepository.create(source)
    await accountsRepository.create(destination)

    const result = await sut.execute({
      ownerId,
      sourceAccountId: source.id.toString(),
      destinationAccountId: destination.id.toString(),
      status: 'SETTLED',
      date: new Date('2026-01-10T00:00:00.000Z'),
      amount: Money.fromCents(5000),
    })

    expect(result.isRight()).toBe(true)
    expect(transactionsRepository.items).toHaveLength(1)
    expect(transactionsRepository.items[0].type).toBe('TRANSFER')
    expect(transactionsRepository.items[0].categoryId).toBeNull()
    expect(transactionsRepository.items[0].sourceAccountId?.toString()).toBe(source.id.toString())
    expect(transactionsRepository.items[0].destinationAccountId?.toString()).toBe(destination.id.toString())
  })

  it('deve debitar a conta de origem e creditar a conta de destino pelo mesmo valor ao efetivar (RNF008)', async () => {
    const ownerId = new UniqueEntityID().toString()
    const accountGroup = makeAccountGroup({ ownerId: new UniqueEntityID(ownerId) })
    const source = makeAccount({ ownerId: new UniqueEntityID(ownerId), accountGroupId: accountGroup.id, initialBalance: Money.fromCents(10000) })
    const destination = makeAccount({ ownerId: new UniqueEntityID(ownerId), accountGroupId: accountGroup.id, initialBalance: Money.fromCents(2000) })

    await accountGroupsRepository.create(accountGroup)
    await accountsRepository.create(source)
    await accountsRepository.create(destination)

    await sut.execute({
      ownerId,
      sourceAccountId: source.id.toString(),
      destinationAccountId: destination.id.toString(),
      status: 'SETTLED',
      date: new Date('2026-01-10T00:00:00.000Z'),
      amount: Money.fromCents(3000),
    })

    const accountsWithBalance = await accountsRepository.findManyByOwnerId(ownerId)
    const sourceWithBalance = accountsWithBalance.find(({ account }) => account.id.equals(source.id))
    const destinationWithBalance = accountsWithBalance.find(({ account }) => account.id.equals(destination.id))

    expect(sourceWithBalance?.balance.amountInCents).toBe(7000)
    expect(destinationWithBalance?.balance.amountInCents).toBe(5000)
  })

  it('deve devolver InvalidTransferAccountError quando a conta de origem e a conta de destino forem a mesma (RN046)', async () => {
    const ownerId = new UniqueEntityID().toString()

    const result = await sut.execute({
      ownerId,
      sourceAccountId: 'mesma-conta',
      destinationAccountId: 'mesma-conta',
      status: 'SETTLED',
      date: new Date(),
      amount: Money.fromCents(1000),
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidTransferAccountError)
    expect(transactionsRepository.items).toHaveLength(0)
  })

  it('deve devolver ResourceNotFoundError quando a conta de origem não existir', async () => {
    const ownerId = new UniqueEntityID().toString()
    const accountGroup = makeAccountGroup({ ownerId: new UniqueEntityID(ownerId) })
    const destination = makeAccount({ ownerId: new UniqueEntityID(ownerId), accountGroupId: accountGroup.id })

    await accountGroupsRepository.create(accountGroup)
    await accountsRepository.create(destination)

    const result = await sut.execute({
      ownerId,
      sourceAccountId: new UniqueEntityID().toString(),
      destinationAccountId: destination.id.toString(),
      status: 'SETTLED',
      date: new Date(),
      amount: Money.fromCents(1000),
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })

  it('deve devolver ResourceNotFoundError quando a conta de destino não existir', async () => {
    const ownerId = new UniqueEntityID().toString()
    const accountGroup = makeAccountGroup({ ownerId: new UniqueEntityID(ownerId) })
    const source = makeAccount({ ownerId: new UniqueEntityID(ownerId), accountGroupId: accountGroup.id })

    await accountGroupsRepository.create(accountGroup)
    await accountsRepository.create(source)

    const result = await sut.execute({
      ownerId,
      sourceAccountId: source.id.toString(),
      destinationAccountId: new UniqueEntityID().toString(),
      status: 'SETTLED',
      date: new Date(),
      amount: Money.fromCents(1000),
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })

  it('deve tratar a conta de outro usuário como inexistente (RN010, RN011)', async () => {
    const ownerId = new UniqueEntityID().toString()
    const accountGroup = makeAccountGroup({ ownerId: new UniqueEntityID(ownerId) })
    const source = makeAccount({ ownerId: new UniqueEntityID(ownerId), accountGroupId: accountGroup.id })
    const destination = makeAccount({ ownerId: new UniqueEntityID() })

    await accountGroupsRepository.create(accountGroup)
    await accountsRepository.create(source)
    await accountsRepository.create(destination)

    const result = await sut.execute({
      ownerId,
      sourceAccountId: source.id.toString(),
      destinationAccountId: destination.id.toString(),
      status: 'SETTLED',
      date: new Date(),
      amount: Money.fromCents(1000),
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })

  it('deve rejeitar quando a conta de origem estiver arquivada (RN025)', async () => {
    const ownerId = new UniqueEntityID().toString()
    const accountGroup = makeAccountGroup({ ownerId: new UniqueEntityID(ownerId) })
    const source = makeAccount({ ownerId: new UniqueEntityID(ownerId), accountGroupId: accountGroup.id })
    const destination = makeAccount({ ownerId: new UniqueEntityID(ownerId), accountGroupId: accountGroup.id })

    source.archive()
    await accountGroupsRepository.create(accountGroup)
    await accountsRepository.create(source)
    await accountsRepository.create(destination)

    const result = await sut.execute({
      ownerId,
      sourceAccountId: source.id.toString(),
      destinationAccountId: destination.id.toString(),
      status: 'SETTLED',
      date: new Date(),
      amount: Money.fromCents(1000),
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceArchivedError)
  })

  it('deve rejeitar quando a conta de destino pertencer a um grupo do tipo "Cartão de Crédito" (RN045)', async () => {
    const ownerId = new UniqueEntityID().toString()
    const defaultGroup = makeAccountGroup({ ownerId: new UniqueEntityID(ownerId), type: 'DEFAULT' })
    const creditCardGroup = makeAccountGroup({ ownerId: new UniqueEntityID(ownerId), type: 'CREDIT_CARD' })
    const source = makeAccount({ ownerId: new UniqueEntityID(ownerId), accountGroupId: defaultGroup.id })
    const destination = makeAccount({ ownerId: new UniqueEntityID(ownerId), accountGroupId: creditCardGroup.id })

    await accountGroupsRepository.create(defaultGroup)
    await accountGroupsRepository.create(creditCardGroup)
    await accountsRepository.create(source)
    await accountsRepository.create(destination)

    const result = await sut.execute({
      ownerId,
      sourceAccountId: source.id.toString(),
      destinationAccountId: destination.id.toString(),
      status: 'SETTLED',
      date: new Date(),
      amount: Money.fromCents(1000),
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidTransferAccountError)
  })

  describe('situação padrão (RN049)', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-06-15T12:00:00.000Z'))
    })

    it('deve criar a transferência como "Prevista" quando a data é futura e não há status nem preferência informados (RN049)', async () => {
      const ownerId = new UniqueEntityID().toString()
      const accountGroup = makeAccountGroup({ ownerId: new UniqueEntityID(ownerId) })
      const source = makeAccount({ ownerId: new UniqueEntityID(ownerId), accountGroupId: accountGroup.id })
      const destination = makeAccount({ ownerId: new UniqueEntityID(ownerId), accountGroupId: accountGroup.id })

      await accountGroupsRepository.create(accountGroup)
      await accountsRepository.create(source)
      await accountsRepository.create(destination)

      const result = await sut.execute({
        ownerId,
        sourceAccountId: source.id.toString(),
        destinationAccountId: destination.id.toString(),
        date: new Date('2026-06-16T00:00:00.000Z'),
        amount: Money.fromCents(1000),
      })

      expect(result.isRight()).toBe(true)
      expect(transactionsRepository.items[0].status).toBe('PLANNED')
    })

    it('deve usar a preferência do usuário quando o status não é informado (RN049)', async () => {
      const owner = makeUser({ defaultTransactionStatus: 'SETTLED' })
      const accountGroup = makeAccountGroup({ ownerId: owner.id })
      const source = makeAccount({ ownerId: owner.id, accountGroupId: accountGroup.id })
      const destination = makeAccount({ ownerId: owner.id, accountGroupId: accountGroup.id })

      await usersRepository.create(owner)
      await accountGroupsRepository.create(accountGroup)
      await accountsRepository.create(source)
      await accountsRepository.create(destination)

      const result = await sut.execute({
        ownerId: owner.id.toString(),
        sourceAccountId: source.id.toString(),
        destinationAccountId: destination.id.toString(),
        date: new Date('2026-06-16T00:00:00.000Z'),
        amount: Money.fromCents(1000),
      })

      expect(result.isRight()).toBe(true)
      expect(transactionsRepository.items[0].status).toBe('SETTLED')
    })
  })
})
