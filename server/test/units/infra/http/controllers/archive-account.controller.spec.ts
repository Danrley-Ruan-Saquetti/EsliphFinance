import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { ArchiveAccountUseCase } from '@domain/account/application/use-cases/archive-account'
import { InMemoryAccountGroupsRepository } from '@infra/database/in-memory/in-memory-account-groups-repository'
import { InMemoryAccountsRepository } from '@infra/database/in-memory/in-memory-accounts-repository'
import { ArchiveAccountController } from '@infra/http/controllers/archive-account.controller'
import { makeAccount } from '@tests/factories/make-account'

let accountsRepository: InMemoryAccountsRepository
let sut: ArchiveAccountController

describe('ArchiveAccountController', () => {
  beforeEach(() => {
    accountsRepository = new InMemoryAccountsRepository(new InMemoryAccountGroupsRepository())
    sut = new ArchiveAccountController(new ArchiveAccountUseCase(accountsRepository))
  })

  it('deve arquivar a conta e devolvê-la no formato de resposta (RN024, RN025)', async () => {
    const ownerId = new UniqueEntityID()
    const account = makeAccount({ ownerId })

    await accountsRepository.create(account)

    const response = await sut.handle({ id: ownerId.toString() }, { id: account.id.toString() })

    expect(response.account.archivedAt).toBeInstanceOf(Date)
  })

  it('deve lançar o erro quando a conta não pertencer ao usuário autenticado (RN010, RN011)', async () => {
    const account = makeAccount({ ownerId: new UniqueEntityID() })

    await accountsRepository.create(account)

    await expect(sut.handle({ id: new UniqueEntityID().toString() }, { id: account.id.toString() })).rejects.toBeInstanceOf(ResourceNotFoundError)
  })
})
