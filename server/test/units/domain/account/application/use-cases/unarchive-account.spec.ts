import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { UnarchiveAccountUseCase } from '@domain/account/application/use-cases/unarchive-account'
import { InMemoryAccountGroupsRepository } from '@infra/database/in-memory/in-memory-account-groups-repository'
import { InMemoryAccountsRepository } from '@infra/database/in-memory/in-memory-accounts-repository'
import { InMemoryTransactionsRepository } from '@infra/database/in-memory/in-memory-transactions-repository'
import { makeAccount } from '@tests/factories/make-account'

let accountsRepository: InMemoryAccountsRepository
let sut: UnarchiveAccountUseCase

describe('Desarquivar conta', () => {
  beforeEach(() => {
    accountsRepository = new InMemoryAccountsRepository(new InMemoryAccountGroupsRepository(), new InMemoryTransactionsRepository())
    sut = new UnarchiveAccountUseCase(accountsRepository)
  })

  it('deve desarquivar a conta do usuário, revertendo o arquivamento (RN024, RN025)', async () => {
    const ownerId = new UniqueEntityID()
    const account = makeAccount({ ownerId, archivedAt: new Date() })

    await accountsRepository.create(account)

    const result = await sut.execute({ accountId: account.id.toString(), ownerId: ownerId.toString() })

    expect(result.isRight()).toBe(true)
    expect(accountsRepository.items[0].isArchived).toBe(false)
  })

  it('deve devolver a conta desarquivada', async () => {
    const ownerId = new UniqueEntityID()
    const account = makeAccount({ ownerId, archivedAt: new Date() })

    await accountsRepository.create(account)

    const result = await sut.execute({ accountId: account.id.toString(), ownerId: ownerId.toString() })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.account.archivedAt).toBeNull()
    }
  })

  it('deve rejeitar quando a conta não existir', async () => {
    const result = await sut.execute({ accountId: new UniqueEntityID().toString(), ownerId: new UniqueEntityID().toString() })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })

  it('deve tratar a conta de outro usuário como inexistente (RN010, RN011)', async () => {
    const account = makeAccount({ ownerId: new UniqueEntityID(), archivedAt: new Date() })

    await accountsRepository.create(account)

    const result = await sut.execute({ accountId: account.id.toString(), ownerId: new UniqueEntityID().toString() })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
    expect(accountsRepository.items[0].isArchived).toBe(true)
  })
})
