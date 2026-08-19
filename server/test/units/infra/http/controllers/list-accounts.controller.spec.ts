import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { Money } from '@core/value-objects/money'
import { ListAccountsUseCase } from '@domain/account/application/use-cases/list-accounts'
import { CreditCardSettings } from '@domain/account/enterprise/value-objects/credit-card-settings'
import { InMemoryAccountGroupsRepository } from '@infra/database/in-memory/in-memory-account-groups-repository'
import { InMemoryAccountsRepository } from '@infra/database/in-memory/in-memory-accounts-repository'
import { InMemoryTransactionsRepository } from '@infra/database/in-memory/in-memory-transactions-repository'
import { ListAccountsController } from '@infra/http/controllers/list-accounts.controller'
import { makeAccount } from '@tests/factories/make-account'
import { makeAccountGroup } from '@tests/factories/make-account-group'

let accountGroupsRepository: InMemoryAccountGroupsRepository
let accountsRepository: InMemoryAccountsRepository
let sut: ListAccountsController

describe('ListAccountsController', () => {
  beforeEach(() => {
    accountGroupsRepository = new InMemoryAccountGroupsRepository()
    accountsRepository = new InMemoryAccountsRepository(accountGroupsRepository, new InMemoryTransactionsRepository())
    sut = new ListAccountsController(new ListAccountsUseCase(accountsRepository))
  })

  it('deve devolver as contas do usuário autenticado no formato de resposta', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = makeAccountGroup({ ownerId })
    const account = makeAccount({ ownerId, accountGroupId: accountGroup.id, name: 'Carteira', initialBalance: Money.fromCents(15000) })

    await accountGroupsRepository.create(accountGroup)
    await accountsRepository.create(account)

    const response = await sut.handle({ id: ownerId.toString() }, {})

    expect(response.accounts).toEqual([
      {
        id: account.id.toString(),
        accountGroupId: accountGroup.id.toString(),
        name: 'Carteira',
        initialBalance: { amountInCents: 15000, formatted: '150.00' },
        balance: { amountInCents: 15000, formatted: '150.00' },
        icon: 'wallet',
        color: '#1E88E5',
        creditCard: null,
        archivedAt: null,
        createdAt: account.createdAt,
        updatedAt: null,
      },
    ])
  })

  it('deve devolver a conta de cartão de crédito sem saldo e com o limite disponível (RN022, RN023)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = makeAccountGroup({ ownerId, type: 'CREDIT_CARD' })
    const creditCard = CreditCardSettings.create({ limit: Money.fromCents(500000), closingDay: 20, dueDay: 28 })

    await accountGroupsRepository.create(accountGroup)
    await accountsRepository.create(makeAccount({ ownerId, accountGroupId: accountGroup.id, name: 'Cartão', creditCard }))

    const response = await sut.handle({ id: ownerId.toString() }, {})

    expect(response.accounts[0].balance).toBeNull()
    expect(response.accounts[0].creditCard).toEqual({
      limit: { amountInCents: 500000, formatted: '5000.00' },
      availableLimit: { amountInCents: 500000, formatted: '5000.00' },
      closingDay: 20,
      dueDay: 28,
    })
  })

  it('deve devolver apenas as contas do grupo informado na query', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = makeAccountGroup({ ownerId })
    const anotherAccountGroup = makeAccountGroup({ ownerId })

    await accountGroupsRepository.create(accountGroup)
    await accountGroupsRepository.create(anotherAccountGroup)
    await accountsRepository.create(makeAccount({ ownerId, accountGroupId: accountGroup.id, name: 'Carteira' }))
    await accountsRepository.create(makeAccount({ ownerId, accountGroupId: anotherAccountGroup.id, name: 'Poupança' }))

    const response = await sut.handle({ id: ownerId.toString() }, { accountGroupId: accountGroup.id.toString() })

    expect(response.accounts).toHaveLength(1)
    expect(response.accounts[0].name).toBe('Carteira')
  })

  it('deve devolver apenas as contas do tipo de grupo informado na query (RN015)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = makeAccountGroup({ ownerId })
    const creditCardAccountGroup = makeAccountGroup({ ownerId, type: 'CREDIT_CARD' })
    const creditCard = CreditCardSettings.create({ limit: Money.fromCents(500000), closingDay: 20, dueDay: 28 })

    await accountGroupsRepository.create(accountGroup)
    await accountGroupsRepository.create(creditCardAccountGroup)
    await accountsRepository.create(makeAccount({ ownerId, accountGroupId: accountGroup.id, name: 'Carteira' }))
    await accountsRepository.create(makeAccount({ ownerId, accountGroupId: creditCardAccountGroup.id, name: 'Cartão', creditCard }))

    const response = await sut.handle({ id: ownerId.toString() }, { accountGroupType: 'CREDIT_CARD' })

    expect(response.accounts).toHaveLength(1)
    expect(response.accounts[0].name).toBe('Cartão')
  })

  it('deve devolver apenas as contas não arquivadas quando a query pedir as não arquivadas (RN025)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = makeAccountGroup({ ownerId })

    await accountGroupsRepository.create(accountGroup)
    await accountsRepository.create(makeAccount({ ownerId, accountGroupId: accountGroup.id, name: 'Carteira' }))
    await accountsRepository.create(makeAccount({ ownerId, accountGroupId: accountGroup.id, name: 'Conta antiga', archivedAt: new Date() }))

    const response = await sut.handle({ id: ownerId.toString() }, { archived: false })

    expect(response.accounts).toHaveLength(1)
    expect(response.accounts[0].name).toBe('Carteira')
  })

  it('deve devolver a data de arquivamento da conta arquivada (RN024)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = makeAccountGroup({ ownerId })
    const archivedAt = new Date('2026-02-20T12:00:00.000Z')

    await accountGroupsRepository.create(accountGroup)
    await accountsRepository.create(makeAccount({ ownerId, accountGroupId: accountGroup.id, name: 'Conta antiga', archivedAt }))

    const response = await sut.handle({ id: ownerId.toString() }, { archived: true })

    expect(response.accounts[0].archivedAt).toEqual(archivedAt)
  })

  it('deve devolver uma lista vazia quando o usuário autenticado não possui contas', async () => {
    await accountsRepository.create(makeAccount())

    const response = await sut.handle({ id: new UniqueEntityID().toString() }, {})

    expect(response.accounts).toEqual([])
  })

  it('deve ignorar o dono informado na query e listar as contas do usuário do token (RN010, RN011)', async () => {
    const ownerId = new UniqueEntityID()
    const anotherOwnerId = new UniqueEntityID()
    const accountGroup = makeAccountGroup({ ownerId })

    await accountGroupsRepository.create(accountGroup)
    await accountsRepository.create(makeAccount({ ownerId, accountGroupId: accountGroup.id, name: 'Carteira' }))
    await accountsRepository.create(makeAccount({ ownerId: anotherOwnerId, name: 'Conta de outro usuário' }))

    const forgedQuery = Object.assign({ archived: false }, { ownerId: anotherOwnerId.toString() })

    const response = await sut.handle({ id: ownerId.toString() }, forgedQuery)

    expect(response.accounts).toHaveLength(1)
    expect(response.accounts[0].name).toBe('Carteira')
  })
})
