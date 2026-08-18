import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { NotAllowedError } from '@core/errors/not-allowed-error'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { UpdateAccountGroupUseCase } from '@domain/account-group/application/use-cases/update-account-group'
import { InMemoryAccountGroupsRepository } from '@infra/database/in-memory/in-memory-account-groups-repository'
import { UpdateAccountGroupController } from '@infra/http/controllers/update-account-group.controller'
import { makeAccountGroup } from '@tests/factories/make-account-group'

let accountGroupsRepository: InMemoryAccountGroupsRepository
let sut: UpdateAccountGroupController

describe('UpdateAccountGroupController', () => {
  beforeEach(() => {
    accountGroupsRepository = new InMemoryAccountGroupsRepository()
    sut = new UpdateAccountGroupController(new UpdateAccountGroupUseCase(accountGroupsRepository))
  })

  it('deve devolver o grupo de contas atualizado no formato de resposta (RN016)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = makeAccountGroup({ ownerId, name: 'Contas', type: 'DEFAULT' })

    await accountGroupsRepository.create(accountGroup)

    const response = await sut.handle({ id: ownerId.toString() }, { id: accountGroup.id.toString() }, { name: 'Contas Correntes', type: 'DEFAULT' })

    expect(response.accountGroup).toEqual({
      id: accountGroup.id.toString(),
      name: 'Contas Correntes',
      type: 'DEFAULT',
      accountsCount: 0,
      createdAt: accountGroup.createdAt,
      updatedAt: accountGroup.updatedAt,
    })
  })

  it('deve propagar ResourceNotFoundError quando o grupo de contas não existe', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }
    const params = { id: new UniqueEntityID().toString() }

    await expect(sut.handle(currentUser, params, { name: 'Contas', type: 'DEFAULT' })).rejects.toBeInstanceOf(ResourceNotFoundError)
  })

  it('deve propagar ResourceNotFoundError quando o grupo de contas é de outro usuário (RN010, RN011)', async () => {
    const accountGroup = makeAccountGroup()

    await accountGroupsRepository.create(accountGroup)

    const currentUser = { id: new UniqueEntityID().toString() }
    const params = { id: accountGroup.id.toString() }

    await expect(sut.handle(currentUser, params, { name: 'Invadido', type: 'DEFAULT' })).rejects.toBeInstanceOf(ResourceNotFoundError)
  })

  it('deve propagar NotAllowedError quando a alteração de tipo é bloqueada por contas vinculadas (RN085)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = makeAccountGroup({ ownerId, name: 'Contas', type: 'DEFAULT' })

    await accountGroupsRepository.create(accountGroup)
    accountGroupsRepository.accountsCountByAccountGroupId.set(accountGroup.id.toString(), 1)

    const currentUser = { id: ownerId.toString() }
    const params = { id: accountGroup.id.toString() }

    await expect(sut.handle(currentUser, params, { name: 'Contas', type: 'CREDIT_CARD' })).rejects.toBeInstanceOf(NotAllowedError)
  })
})
