import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { GetAccountGroupUseCase } from '@domain/account-group/application/use-cases/get-account-group'
import { InMemoryAccountGroupsRepository } from '@infra/database/in-memory/in-memory-account-groups-repository'
import { makeAccountGroup } from '@tests/factories/make-account-group'

let accountGroupsRepository: InMemoryAccountGroupsRepository
let sut: GetAccountGroupUseCase

describe('Consultar grupo de contas', () => {
  beforeEach(() => {
    accountGroupsRepository = new InMemoryAccountGroupsRepository()
    sut = new GetAccountGroupUseCase(accountGroupsRepository)
  })

  it('deve retornar o grupo de contas do próprio dono', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = makeAccountGroup({ ownerId, name: 'Cartões', type: 'CREDIT_CARD' })

    await accountGroupsRepository.create(accountGroup)

    const result = await sut.execute({ accountGroupId: accountGroup.id.toString(), ownerId: ownerId.toString() })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.accountGroup.name).toBe('Cartões')
      expect(result.value.accountGroup.type).toBe('CREDIT_CARD')
    }
  })

  it('deve informar a quantidade de contas vinculadas ao grupo de contas', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = makeAccountGroup({ ownerId })

    await accountGroupsRepository.create(accountGroup)
    accountGroupsRepository.accountsCountByAccountGroupId.set(accountGroup.id.toString(), 2)

    const result = await sut.execute({ accountGroupId: accountGroup.id.toString(), ownerId: ownerId.toString() })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.accountsCount).toBe(2)
    }
  })

  it('deve retornar ResourceNotFoundError quando o grupo de contas não existe', async () => {
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
  })
})
