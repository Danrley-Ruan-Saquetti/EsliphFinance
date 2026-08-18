import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { UnarchiveAccountUseCase } from '@domain/account/application/use-cases/unarchive-account'
import { InMemoryAccountGroupsRepository } from '@infra/database/in-memory/in-memory-account-groups-repository'
import { InMemoryAccountsRepository } from '@infra/database/in-memory/in-memory-accounts-repository'
import { UnarchiveAccountController } from '@infra/http/controllers/unarchive-account.controller'
import { makeAccount } from '@tests/factories/make-account'

let accountsRepository: InMemoryAccountsRepository
let sut: UnarchiveAccountController

describe('UnarchiveAccountController', () => {
  beforeEach(() => {
    accountsRepository = new InMemoryAccountsRepository(new InMemoryAccountGroupsRepository())
    sut = new UnarchiveAccountController(new UnarchiveAccountUseCase(accountsRepository))
  })

  it('deve desarquivar a conta e devolvê-la no formato de resposta (RN024, RN025)', async () => {
    const ownerId = new UniqueEntityID()
    const account = makeAccount({ ownerId, archivedAt: new Date() })

    await accountsRepository.create(account)

    const response = await sut.handle({ id: ownerId.toString() }, { id: account.id.toString() })

    expect(response.account.archivedAt).toBeNull()
  })

  it('deve lançar o erro quando a conta não pertencer ao usuário autenticado (RN010, RN011)', async () => {
    const account = makeAccount({ ownerId: new UniqueEntityID(), archivedAt: new Date() })

    await accountsRepository.create(account)

    await expect(sut.handle({ id: new UniqueEntityID().toString() }, { id: account.id.toString() })).rejects.toBeInstanceOf(ResourceNotFoundError)
  })
})
