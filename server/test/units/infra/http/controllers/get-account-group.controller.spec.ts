import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { GetAccountGroupUseCase } from '@domain/account-group/application/use-cases/get-account-group'
import { InMemoryAccountGroupsRepository } from '@infra/database/in-memory/in-memory-account-groups-repository'
import { GetAccountGroupController } from '@infra/http/controllers/get-account-group.controller'
import { makeAccountGroup } from '@tests/factories/make-account-group'

let accountGroupsRepository: InMemoryAccountGroupsRepository
let sut: GetAccountGroupController

describe('GetAccountGroupController', () => {
  beforeEach(() => {
    accountGroupsRepository = new InMemoryAccountGroupsRepository()
    sut = new GetAccountGroupController(new GetAccountGroupUseCase(accountGroupsRepository))
  })

  it('deve devolver o grupo de contas do usuário autenticado no formato de resposta', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = makeAccountGroup({ ownerId, name: 'Cartões', type: 'CREDIT_CARD' })

    await accountGroupsRepository.create(accountGroup)
    accountGroupsRepository.accountsCountByAccountGroupId.set(accountGroup.id.toString(), 2)

    const response = await sut.handle({ id: ownerId.toString() }, { id: accountGroup.id.toString() })

    expect(response.accountGroup).toEqual({
      id: accountGroup.id.toString(),
      name: 'Cartões',
      type: 'CREDIT_CARD',
      accountsCount: 2,
      createdAt: accountGroup.createdAt,
      updatedAt: null,
    })
  })

  it('deve propagar ResourceNotFoundError quando o grupo de contas não existe', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }
    const params = { id: new UniqueEntityID().toString() }

    await expect(sut.handle(currentUser, params)).rejects.toBeInstanceOf(ResourceNotFoundError)
  })

  it('deve propagar ResourceNotFoundError quando o grupo de contas é de outro usuário (RN010, RN011)', async () => {
    const accountGroup = makeAccountGroup()

    await accountGroupsRepository.create(accountGroup)

    const currentUser = { id: new UniqueEntityID().toString() }
    const params = { id: accountGroup.id.toString() }

    await expect(sut.handle(currentUser, params)).rejects.toBeInstanceOf(ResourceNotFoundError)
  })
})
