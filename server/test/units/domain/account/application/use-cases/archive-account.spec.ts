import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { ArchiveAccountUseCase } from '@domain/account/application/use-cases/archive-account'
import { InMemoryAccountGroupsRepository } from '@infra/database/in-memory/in-memory-account-groups-repository'
import { InMemoryAccountsRepository } from '@infra/database/in-memory/in-memory-accounts-repository'
import { makeAccount } from '@tests/factories/make-account'

let accountsRepository: InMemoryAccountsRepository
let sut: ArchiveAccountUseCase

describe('Arquivar conta', () => {
  beforeEach(() => {
    accountsRepository = new InMemoryAccountsRepository(new InMemoryAccountGroupsRepository())
    sut = new ArchiveAccountUseCase(accountsRepository)
  })

  it('deve arquivar a conta do usuário (RN024, RN025)', async () => {
    const ownerId = new UniqueEntityID()
    const account = makeAccount({ ownerId })

    await accountsRepository.create(account)

    const result = await sut.execute({ accountId: account.id.toString(), ownerId: ownerId.toString() })

    expect(result.isRight()).toBe(true)
    expect(accountsRepository.items[0].isArchived).toBe(true)
  })

  it('deve devolver a conta arquivada', async () => {
    const ownerId = new UniqueEntityID()
    const account = makeAccount({ ownerId })

    await accountsRepository.create(account)

    const result = await sut.execute({ accountId: account.id.toString(), ownerId: ownerId.toString() })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.account.archivedAt).toBeInstanceOf(Date)
    }
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
    expect(accountsRepository.items[0].isArchived).toBe(false)
  })
})
