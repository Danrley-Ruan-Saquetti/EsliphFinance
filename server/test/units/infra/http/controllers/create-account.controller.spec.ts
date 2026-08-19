import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { Money } from '@core/value-objects/money'
import { CreateAccountUseCase } from '@domain/account/application/use-cases/create-account'
import { InvalidAccountGroupTypeError } from '@domain/account/application/use-cases/errors/invalid-account-group-type-error'
import { InMemoryAccountGroupsRepository } from '@infra/database/in-memory/in-memory-account-groups-repository'
import { InMemoryAccountsRepository } from '@infra/database/in-memory/in-memory-accounts-repository'
import { InMemoryTransactionsRepository } from '@infra/database/in-memory/in-memory-transactions-repository'
import { CreateAccountController } from '@infra/http/controllers/create-account.controller'
import { makeAccountGroup } from '@tests/factories/make-account-group'

let accountsRepository: InMemoryAccountsRepository
let accountGroupsRepository: InMemoryAccountGroupsRepository
let sut: CreateAccountController

describe('CreateAccountController', () => {
  beforeEach(() => {
    accountGroupsRepository = new InMemoryAccountGroupsRepository()
    accountsRepository = new InMemoryAccountsRepository(accountGroupsRepository, new InMemoryTransactionsRepository())
    sut = new CreateAccountController(new CreateAccountUseCase(accountsRepository, accountGroupsRepository))
  })

  it('deve devolver a conta criada no formato de resposta', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }
    const accountGroup = makeAccountGroup({ ownerId: new UniqueEntityID(currentUser.id) })

    await accountGroupsRepository.create(accountGroup)

    const response = await sut.handle(currentUser, {
      accountGroupId: accountGroup.id.toString(),
      name: 'Carteira',
      initialBalance: Money.fromCents(15000),
      icon: 'wallet',
      color: '#1E88E5',
    })

    expect(response.account).toEqual({
      id: accountsRepository.items[0].id.toString(),
      accountGroupId: accountGroup.id.toString(),
      name: 'Carteira',
      initialBalance: { amountInCents: 15000, formatted: '150.00' },
      icon: 'wallet',
      color: '#1E88E5',
      creditCard: null,
      archivedAt: null,
      createdAt: accountsRepository.items[0].createdAt,
      updatedAt: null,
    })
  })

  it('deve devolver a conta de cartão de crédito com o limite, o dia de fechamento e o dia de vencimento (RN019)', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }
    const accountGroup = makeAccountGroup({ ownerId: new UniqueEntityID(currentUser.id), type: 'CREDIT_CARD' })

    await accountGroupsRepository.create(accountGroup)

    const response = await sut.handle(currentUser, {
      accountGroupId: accountGroup.id.toString(),
      name: 'Cartão',
      color: '#1E88E5',
      creditCard: { limit: Money.fromCents(500000), closingDay: 20, dueDay: 28 },
    })

    expect(response.account.creditCard).toEqual({ limit: { amountInCents: 500000, formatted: '5000.00' }, closingDay: 20, dueDay: 28 })
    expect(response.account.initialBalance).toEqual({ amountInCents: 0, formatted: '0.00' })
  })

  it('deve criar a conta com o saldo inicial zerado e o ícone padrão quando não forem informados (RN018)', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }
    const accountGroup = makeAccountGroup({ ownerId: new UniqueEntityID(currentUser.id) })

    await accountGroupsRepository.create(accountGroup)

    const response = await sut.handle(currentUser, { accountGroupId: accountGroup.id.toString(), name: 'Carteira', color: '#1E88E5' })

    expect(response.account.initialBalance).toEqual({ amountInCents: 0, formatted: '0.00' })
    expect(response.account.icon).toBe('wallet')
  })

  it('deve persistir a conta vinculada ao usuário autenticado (RN010)', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }
    const accountGroup = makeAccountGroup({ ownerId: new UniqueEntityID(currentUser.id) })

    await accountGroupsRepository.create(accountGroup)

    await sut.handle(currentUser, { accountGroupId: accountGroup.id.toString(), name: 'Carteira', color: '#1E88E5' })

    expect(accountsRepository.items).toHaveLength(1)
    expect(accountsRepository.items[0].ownerId.toString()).toBe(currentUser.id)
  })

  it('deve ignorar o dono informado no corpo e vincular a conta ao usuário do token (RN010, RN011)', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }
    const accountGroup = makeAccountGroup({ ownerId: new UniqueEntityID(currentUser.id) })

    await accountGroupsRepository.create(accountGroup)

    const forgedBody = Object.assign(
      { accountGroupId: accountGroup.id.toString(), name: 'Carteira', color: '#1E88E5' },
      { ownerId: new UniqueEntityID().toString() },
    )

    await sut.handle(currentUser, forgedBody)

    expect(accountsRepository.items[0].ownerId.toString()).toBe(currentUser.id)
  })

  it('deve lançar ResourceNotFoundError quando o grupo de contas for de outro usuário (RN010, RN011)', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }
    const accountGroup = makeAccountGroup({ ownerId: new UniqueEntityID() })

    await accountGroupsRepository.create(accountGroup)

    await expect(sut.handle(currentUser, { accountGroupId: accountGroup.id.toString(), name: 'Carteira', color: '#1E88E5' })).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    )
  })

  it('deve lançar InvalidAccountGroupTypeError quando o grupo for do tipo "Cartão de Crédito" e os dados do cartão não forem informados (RN019)', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }
    const accountGroup = makeAccountGroup({ ownerId: new UniqueEntityID(currentUser.id), type: 'CREDIT_CARD' })

    await accountGroupsRepository.create(accountGroup)

    await expect(sut.handle(currentUser, { accountGroupId: accountGroup.id.toString(), name: 'Cartão', color: '#1E88E5' })).rejects.toBeInstanceOf(
      InvalidAccountGroupTypeError,
    )
  })

  it('deve lançar InvalidAccountGroupTypeError quando o grupo for do tipo "Padrão" e os dados do cartão forem informados (RN019)', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }
    const accountGroup = makeAccountGroup({ ownerId: new UniqueEntityID(currentUser.id) })

    await accountGroupsRepository.create(accountGroup)

    await expect(
      sut.handle(currentUser, {
        accountGroupId: accountGroup.id.toString(),
        name: 'Carteira',
        color: '#1E88E5',
        creditCard: { limit: Money.fromCents(500000), closingDay: 20, dueDay: 28 },
      }),
    ).rejects.toBeInstanceOf(InvalidAccountGroupTypeError)
  })
})
