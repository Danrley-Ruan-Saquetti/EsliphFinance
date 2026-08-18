import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { DeleteAccountGroupUseCase } from '@domain/account-group/application/use-cases/delete-account-group'
import { AccountGroupHasLinkedAccountsError } from '@domain/account-group/application/use-cases/errors/account-group-has-linked-accounts-error'
import { InMemoryAccountGroupsRepository } from '@infra/database/in-memory/in-memory-account-groups-repository'
import { DeleteAccountGroupController } from '@infra/http/controllers/delete-account-group.controller'
import { makeAccountGroup } from '@tests/factories/make-account-group'

let accountGroupsRepository: InMemoryAccountGroupsRepository
let sut: DeleteAccountGroupController

describe('DeleteAccountGroupController', () => {
  beforeEach(() => {
    accountGroupsRepository = new InMemoryAccountGroupsRepository()
    sut = new DeleteAccountGroupController(new DeleteAccountGroupUseCase(accountGroupsRepository))
  })

  it('deve excluir o grupo de contas sem vínculo (RN017)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = makeAccountGroup({ ownerId })

    await accountGroupsRepository.create(accountGroup)

    await sut.handle({ id: ownerId.toString() }, { id: accountGroup.id.toString() })

    expect(accountGroupsRepository.items).toHaveLength(0)
  })

  it('deve lançar o erro quando o grupo possuir contas vinculadas (RN017)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = makeAccountGroup({ ownerId })

    await accountGroupsRepository.create(accountGroup)
    accountGroupsRepository.accountsCountByAccountGroupId.set(accountGroup.id.toString(), 2)

    await expect(sut.handle({ id: ownerId.toString() }, { id: accountGroup.id.toString() })).rejects.toBeInstanceOf(AccountGroupHasLinkedAccountsError)
  })

  it('deve lançar o erro quando o grupo não pertencer ao usuário autenticado (RN010, RN011)', async () => {
    const accountGroup = makeAccountGroup()

    await accountGroupsRepository.create(accountGroup)

    await expect(sut.handle({ id: new UniqueEntityID().toString() }, { id: accountGroup.id.toString() })).rejects.toBeInstanceOf(ResourceNotFoundError)
  })
})
