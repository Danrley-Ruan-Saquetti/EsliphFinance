import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { Money } from '@core/value-objects/money'
import { InvalidTransferAccountError } from '@domain/transaction/application/use-cases/errors/invalid-transfer-account-error'
import { CreateTransferUseCase } from '@domain/transaction/application/use-cases/create-transfer'
import { InMemoryAccountGroupsRepository } from '@infra/database/in-memory/in-memory-account-groups-repository'
import { InMemoryAccountsRepository } from '@infra/database/in-memory/in-memory-accounts-repository'
import { InMemoryTransactionsRepository } from '@infra/database/in-memory/in-memory-transactions-repository'
import { InMemoryUsersRepository } from '@infra/database/in-memory/in-memory-users-repository'
import { CreateTransferController } from '@infra/http/controllers/create-transfer.controller'
import { makeAccount } from '@tests/factories/make-account'
import { makeAccountGroup } from '@tests/factories/make-account-group'

let transactionsRepository: InMemoryTransactionsRepository
let accountsRepository: InMemoryAccountsRepository
let accountGroupsRepository: InMemoryAccountGroupsRepository
let usersRepository: InMemoryUsersRepository
let sut: CreateTransferController

describe('CreateTransferController', () => {
  beforeEach(() => {
    accountGroupsRepository = new InMemoryAccountGroupsRepository()
    transactionsRepository = new InMemoryTransactionsRepository()
    accountsRepository = new InMemoryAccountsRepository(accountGroupsRepository, transactionsRepository)
    usersRepository = new InMemoryUsersRepository()
    sut = new CreateTransferController(new CreateTransferUseCase(transactionsRepository, accountsRepository, accountGroupsRepository, usersRepository))
  })

  it('deve devolver a transferência criada no formato de resposta', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }
    const accountGroup = makeAccountGroup({ ownerId: new UniqueEntityID(currentUser.id) })
    const source = makeAccount({ ownerId: new UniqueEntityID(currentUser.id), accountGroupId: accountGroup.id })
    const destination = makeAccount({ ownerId: new UniqueEntityID(currentUser.id), accountGroupId: accountGroup.id })

    await accountGroupsRepository.create(accountGroup)
    await accountsRepository.create(source)
    await accountsRepository.create(destination)

    const date = new Date('2026-01-10T00:00:00.000Z')

    const response = await sut.handle(currentUser, {
      sourceAccountId: source.id.toString(),
      destinationAccountId: destination.id.toString(),
      status: 'SETTLED',
      date,
      amount: Money.fromCents(5000),
      description: 'Transferência para poupança',
    })

    expect(response.transaction).toEqual({
      id: transactionsRepository.items[0].id.toString(),
      accountId: null,
      categoryId: null,
      sourceAccountId: source.id.toString(),
      destinationAccountId: destination.id.toString(),
      type: 'TRANSFER',
      status: 'SETTLED',
      date,
      amount: { amountInCents: 5000, formatted: '50.00' },
      description: 'Transferência para poupança',
      createdAt: transactionsRepository.items[0].createdAt,
      updatedAt: null,
    })
  })

  it('deve ignorar o dono informado no corpo e vincular a transferência ao usuário do token (RN010, RN011)', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }
    const accountGroup = makeAccountGroup({ ownerId: new UniqueEntityID(currentUser.id) })
    const source = makeAccount({ ownerId: new UniqueEntityID(currentUser.id), accountGroupId: accountGroup.id })
    const destination = makeAccount({ ownerId: new UniqueEntityID(currentUser.id), accountGroupId: accountGroup.id })

    await accountGroupsRepository.create(accountGroup)
    await accountsRepository.create(source)
    await accountsRepository.create(destination)

    const forgedBody = Object.assign(
      {
        sourceAccountId: source.id.toString(),
        destinationAccountId: destination.id.toString(),
        status: 'SETTLED' as const,
        date: new Date('2026-01-10T00:00:00.000Z'),
        amount: Money.fromCents(5000),
      },
      { ownerId: new UniqueEntityID().toString() },
    )

    await sut.handle(currentUser, forgedBody)

    expect(transactionsRepository.items[0].ownerId.toString()).toBe(currentUser.id)
  })

  it('deve lançar InvalidTransferAccountError quando a conta de origem e a conta de destino forem a mesma (RN046)', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }
    const accountGroup = makeAccountGroup({ ownerId: new UniqueEntityID(currentUser.id) })
    const account = makeAccount({ ownerId: new UniqueEntityID(currentUser.id), accountGroupId: accountGroup.id })

    await accountGroupsRepository.create(accountGroup)
    await accountsRepository.create(account)

    await expect(
      sut.handle(currentUser, {
        sourceAccountId: account.id.toString(),
        destinationAccountId: account.id.toString(),
        status: 'SETTLED',
        date: new Date('2026-01-10T00:00:00.000Z'),
        amount: Money.fromCents(5000),
      }),
    ).rejects.toBeInstanceOf(InvalidTransferAccountError)
  })
})
