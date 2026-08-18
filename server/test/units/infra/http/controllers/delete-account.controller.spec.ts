import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { DeleteAccountUseCase } from '@domain/account/application/use-cases/delete-account'
import { InMemoryAccountGroupsRepository } from '@infra/database/in-memory/in-memory-account-groups-repository'
import { InMemoryAccountsRepository } from '@infra/database/in-memory/in-memory-accounts-repository'
import { DeleteAccountController } from '@infra/http/controllers/delete-account.controller'
import { makeAccount } from '@tests/factories/make-account'

let accountsRepository: InMemoryAccountsRepository
let sut: DeleteAccountController

describe('DeleteAccountController', () => {
  beforeEach(() => {
    accountsRepository = new InMemoryAccountsRepository(new InMemoryAccountGroupsRepository())
    sut = new DeleteAccountController(new DeleteAccountUseCase(accountsRepository))
  })

  it('deve excluir a conta sem vínculo (RN024)', async () => {
    const ownerId = new UniqueEntityID()
    const account = makeAccount({ ownerId })

    await accountsRepository.create(account)

    await sut.handle({ id: ownerId.toString() }, { id: account.id.toString() })

    expect(accountsRepository.items).toHaveLength(0)
  })

  it('deve lançar o erro quando a conta não pertencer ao usuário autenticado (RN010, RN011)', async () => {
    const account = makeAccount({ ownerId: new UniqueEntityID() })

    await accountsRepository.create(account)

    await expect(sut.handle({ id: new UniqueEntityID().toString() }, { id: account.id.toString() })).rejects.toBeInstanceOf(ResourceNotFoundError)
  })
})
