import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { NotAllowedError } from '@core/errors/not-allowed-error'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { UpdateAccountGroupUseCase } from '@domain/account-group/application/use-cases/update-account-group'
import { InMemoryAccountGroupsRepository } from '@infra/database/in-memory/in-memory-account-groups-repository'
import { makeAccountGroup } from '@tests/factories/make-account-group'

let accountGroupsRepository: InMemoryAccountGroupsRepository
let sut: UpdateAccountGroupUseCase

describe('Editar grupo de contas', () => {
  beforeEach(() => {
    accountGroupsRepository = new InMemoryAccountGroupsRepository()
    sut = new UpdateAccountGroupUseCase(accountGroupsRepository)
  })

  it('deve alterar o nome do grupo de contas (RN016)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = makeAccountGroup({ ownerId, name: 'Contas', type: 'DEFAULT' })

    await accountGroupsRepository.create(accountGroup)

    const result = await sut.execute({ accountGroupId: accountGroup.id.toString(), ownerId: ownerId.toString(), name: 'Contas Correntes', type: 'DEFAULT' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.accountGroup.name).toBe('Contas Correntes')
    }
  })

  it('deve alterar o tipo do grupo de contas quando não houver contas vinculadas (RN015, RN085)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = makeAccountGroup({ ownerId, name: 'Contas', type: 'DEFAULT' })

    await accountGroupsRepository.create(accountGroup)

    const result = await sut.execute({ accountGroupId: accountGroup.id.toString(), ownerId: ownerId.toString(), name: 'Contas', type: 'CREDIT_CARD' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.accountGroup.type).toBe('CREDIT_CARD')
    }
  })

  it('deve rejeitar a alteração de tipo quando o grupo de contas possuir contas vinculadas (RN085)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = makeAccountGroup({ ownerId, name: 'Contas', type: 'DEFAULT' })

    await accountGroupsRepository.create(accountGroup)
    accountGroupsRepository.accountsCountByAccountGroupId.set(accountGroup.id.toString(), 1)

    const result = await sut.execute({ accountGroupId: accountGroup.id.toString(), ownerId: ownerId.toString(), name: 'Contas', type: 'CREDIT_CARD' })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(NotAllowedError)
    }
    expect(accountGroupsRepository.items[0].type).toBe('DEFAULT')
  })

  it('deve permitir manter o mesmo tipo quando o grupo de contas possuir contas vinculadas (RN085)', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = makeAccountGroup({ ownerId, name: 'Contas', type: 'DEFAULT' })

    await accountGroupsRepository.create(accountGroup)
    accountGroupsRepository.accountsCountByAccountGroupId.set(accountGroup.id.toString(), 1)

    const result = await sut.execute({ accountGroupId: accountGroup.id.toString(), ownerId: ownerId.toString(), name: 'Contas Renomeadas', type: 'DEFAULT' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.accountGroup.name).toBe('Contas Renomeadas')
      expect(result.value.accountGroup.type).toBe('DEFAULT')
    }
  })

  it('deve rejeitar quando o grupo de contas não existir', async () => {
    const result = await sut.execute({ accountGroupId: new UniqueEntityID().toString(), ownerId: new UniqueEntityID().toString(), name: 'Contas', type: 'DEFAULT' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })

  it('deve tratar o grupo de contas de outro usuário como inexistente (RN010, RN011)', async () => {
    const accountGroup = makeAccountGroup({ ownerId: new UniqueEntityID(), name: 'Contas', type: 'DEFAULT' })

    await accountGroupsRepository.create(accountGroup)

    const result = await sut.execute({
      accountGroupId: accountGroup.id.toString(),
      ownerId: new UniqueEntityID().toString(),
      name: 'Outro Nome',
      type: 'CREDIT_CARD',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
    expect(accountGroupsRepository.items[0].name).toBe('Contas')
  })
})
