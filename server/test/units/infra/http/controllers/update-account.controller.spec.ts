import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { Money } from '@core/value-objects/money'
import { UpdateAccountUseCase } from '@domain/account/application/use-cases/update-account'
import { InvalidAccountGroupTypeError } from '@domain/account/application/use-cases/errors/invalid-account-group-type-error'
import { InMemoryAccountGroupsRepository } from '@infra/database/in-memory/in-memory-account-groups-repository'
import { InMemoryAccountsRepository } from '@infra/database/in-memory/in-memory-accounts-repository'
import { UpdateAccountController } from '@infra/http/controllers/update-account.controller'
import { makeAccount } from '@tests/factories/make-account'
import { makeAccountGroup } from '@tests/factories/make-account-group'

let accountsRepository: InMemoryAccountsRepository
let accountGroupsRepository: InMemoryAccountGroupsRepository
let sut: UpdateAccountController

describe('UpdateAccountController', () => {
  beforeEach(() => {
    accountGroupsRepository = new InMemoryAccountGroupsRepository()
    accountsRepository = new InMemoryAccountsRepository(accountGroupsRepository)
    sut = new UpdateAccountController(new UpdateAccountUseCase(accountsRepository, accountGroupsRepository))
  })

  it('deve devolver a conta editada no formato de resposta', async () => {
    const ownerId = new UniqueEntityID()
    const currentUser = { id: ownerId.toString() }
    const accountGroup = makeAccountGroup({ ownerId })
    const account = makeAccount({ ownerId, accountGroupId: accountGroup.id, name: 'Carteira', color: '#1E88E5' })

    await accountGroupsRepository.create(accountGroup)
    await accountsRepository.create(account)

    const response = await sut.handle(currentUser, { id: account.id.toString() }, {
      accountGroupId: accountGroup.id.toString(),
      name: 'Conta corrente',
      initialBalance: Money.fromCents(30000),
      icon: 'bank',
      color: '#43A047',
    })

    expect(response.account).toEqual({
      id: account.id.toString(),
      accountGroupId: accountGroup.id.toString(),
      name: 'Conta corrente',
      initialBalance: { amountInCents: 30000, formatted: '300.00' },
      icon: 'bank',
      color: '#43A047',
      creditCard: null,
      archivedAt: null,
      createdAt: account.createdAt,
      updatedAt: accountsRepository.items[0].updatedAt,
    })
  })

  it('deve lançar ResourceNotFoundError quando a conta não existir', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }

    await expect(
      sut.handle(currentUser, { id: new UniqueEntityID().toString() }, { accountGroupId: new UniqueEntityID().toString(), name: 'Carteira', color: '#1E88E5' }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError)
  })

  it('deve lançar ResourceNotFoundError quando a conta for de outro usuário (RN010, RN011)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = makeAccountGroup({ ownerId })
    const account = makeAccount({ ownerId, accountGroupId: accountGroup.id })

    await accountGroupsRepository.create(accountGroup)
    await accountsRepository.create(account)

    const currentUser = { id: new UniqueEntityID().toString() }

    await expect(
      sut.handle(currentUser, { id: account.id.toString() }, { accountGroupId: accountGroup.id.toString(), name: 'Carteira', color: '#1E88E5' }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError)
  })

  it('deve lançar InvalidAccountGroupTypeError quando a troca de grupo mudar o tipo da conta (RN018, RN019)', async () => {
    const ownerId = new UniqueEntityID()
    const currentUser = { id: ownerId.toString() }
    const accountGroup = makeAccountGroup({ ownerId, type: 'DEFAULT' })
    const creditCardAccountGroup = makeAccountGroup({ ownerId, type: 'CREDIT_CARD' })
    const account = makeAccount({ ownerId, accountGroupId: accountGroup.id })

    await accountGroupsRepository.create(accountGroup)
    await accountGroupsRepository.create(creditCardAccountGroup)
    await accountsRepository.create(account)

    await expect(
      sut.handle(
        currentUser,
        { id: account.id.toString() },
        {
          accountGroupId: creditCardAccountGroup.id.toString(),
          name: account.name,
          color: account.color,
          creditCard: { limit: Money.fromCents(500000), closingDay: 20, dueDay: 28 },
        },
      ),
    ).rejects.toBeInstanceOf(InvalidAccountGroupTypeError)
  })
})
