import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { DeleteAccountUseCase } from '@domain/account/application/use-cases/delete-account'
import { InMemoryAccountGroupsRepository } from '@infra/database/in-memory/in-memory-account-groups-repository'
import { InMemoryAccountsRepository } from '@infra/database/in-memory/in-memory-accounts-repository'
import { InMemoryTransactionsRepository } from '@infra/database/in-memory/in-memory-transactions-repository'
import { makeAccount } from '@tests/factories/make-account'

let accountsRepository: InMemoryAccountsRepository
let sut: DeleteAccountUseCase

describe('Excluir conta', () => {
  beforeEach(() => {
    accountsRepository = new InMemoryAccountsRepository(new InMemoryAccountGroupsRepository(), new InMemoryTransactionsRepository())
    sut = new DeleteAccountUseCase(accountsRepository)
  })

  it('deve excluir a conta do usuário (RN024)', async () => {
    const ownerId = new UniqueEntityID()
    const account = makeAccount({ ownerId })

    await accountsRepository.create(account)

    const result = await sut.execute({ accountId: account.id.toString(), ownerId: ownerId.toString() })

    expect(result.isRight()).toBe(true)
    expect(accountsRepository.items).toHaveLength(0)
  })

  it('deve excluir a conta arquivada (RN024, RN025)', async () => {
    const ownerId = new UniqueEntityID()
    const account = makeAccount({ ownerId, archivedAt: new Date() })

    await accountsRepository.create(account)

    const result = await sut.execute({ accountId: account.id.toString(), ownerId: ownerId.toString() })

    expect(result.isRight()).toBe(true)
    expect(accountsRepository.items).toHaveLength(0)
  })

  it('deve rejeitar quando a conta não existir', async () => {
    const result = await sut.execute({ accountId: new UniqueEntityID().toString(), ownerId: new UniqueEntityID().toString() })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })

  it('deve tratar a conta de outro usuário como inexistente (RN010, RN011)', async () => {
    const account = makeAccount({ ownerId: new UniqueEntityID() })

    await accountsRepository.create(account)

    const result = await sut.execute({ accountId: account.id.toString(), ownerId: new UniqueEntityID().toString() })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
    expect(accountsRepository.items).toHaveLength(1)
  })
})
