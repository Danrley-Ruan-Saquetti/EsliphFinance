import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { DeleteAccountGroupUseCase } from '@domain/account-group/application/use-cases/delete-account-group'
import { AccountGroupHasLinkedAccountsError } from '@domain/account-group/application/use-cases/errors/account-group-has-linked-accounts-error'
import { InMemoryAccountGroupsRepository } from '@infra/database/in-memory/in-memory-account-groups-repository'
import { makeAccountGroup } from '@tests/factories/make-account-group'

let accountGroupsRepository: InMemoryAccountGroupsRepository
let sut: DeleteAccountGroupUseCase

describe('Excluir grupo de contas', () => {
  beforeEach(() => {
    accountGroupsRepository = new InMemoryAccountGroupsRepository()
    sut = new DeleteAccountGroupUseCase(accountGroupsRepository)
  })

  it('deve excluir o grupo de contas sem contas vinculadas (RN017)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = makeAccountGroup({ ownerId })

    await accountGroupsRepository.create(accountGroup)

    const result = await sut.execute({ accountGroupId: accountGroup.id.toString(), ownerId: ownerId.toString() })

    expect(result.isRight()).toBe(true)
    expect(accountGroupsRepository.items).toHaveLength(0)
  })

  it('deve rejeitar a exclusão quando o grupo possuir 1 conta vinculada, citando a quantidade no singular (RN017)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = makeAccountGroup({ ownerId })

    await accountGroupsRepository.create(accountGroup)
    accountGroupsRepository.accountsCountByAccountGroupId.set(accountGroup.id.toString(), 1)

    const result = await sut.execute({ accountGroupId: accountGroup.id.toString(), ownerId: ownerId.toString() })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(AccountGroupHasLinkedAccountsError)
      expect(result.value.message).toBe('Este grupo possui 1 conta vinculada e não pode ser excluído')
    }
    expect(accountGroupsRepository.items).toHaveLength(1)
  })

  it('deve rejeitar a exclusão quando o grupo possuir várias contas vinculadas, citando a quantidade no plural (RN017)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = makeAccountGroup({ ownerId })

    await accountGroupsRepository.create(accountGroup)
    accountGroupsRepository.accountsCountByAccountGroupId.set(accountGroup.id.toString(), 3)

    const result = await sut.execute({ accountGroupId: accountGroup.id.toString(), ownerId: ownerId.toString() })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(AccountGroupHasLinkedAccountsError)
      expect(result.value.message).toBe('Este grupo possui 3 contas vinculadas e não pode ser excluído')
    }
    expect(accountGroupsRepository.items).toHaveLength(1)
  })

  it('deve retornar ResourceNotFoundError quando o grupo de contas não existir', async () => {
    const result = await sut.execute({ accountGroupId: new UniqueEntityID().toString(), ownerId: new UniqueEntityID().toString() })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(ResourceNotFoundError)
    }
  })

  it('deve retornar ResourceNotFoundError quando o grupo de contas é de outro usuário (RN010, RN011)', async () => {
    const accountGroup = makeAccountGroup()

    await accountGroupsRepository.create(accountGroup)

    const result = await sut.execute({ accountGroupId: accountGroup.id.toString(), ownerId: new UniqueEntityID().toString() })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(ResourceNotFoundError)
    }
    expect(accountGroupsRepository.items).toHaveLength(1)
  })
})
