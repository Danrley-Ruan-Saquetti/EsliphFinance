import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { ListAccountGroupsUseCase } from '@domain/account-group/application/use-cases/list-account-groups'
import { InMemoryAccountGroupsRepository } from '@infra/database/in-memory/in-memory-account-groups-repository'
import { ListAccountGroupsController } from '@infra/http/controllers/list-account-groups.controller'
import { makeAccountGroup } from '@tests/factories/make-account-group'

let accountGroupsRepository: InMemoryAccountGroupsRepository
let sut: ListAccountGroupsController

describe('ListAccountGroupsController', () => {
  beforeEach(() => {
    accountGroupsRepository = new InMemoryAccountGroupsRepository()
    sut = new ListAccountGroupsController(new ListAccountGroupsUseCase(accountGroupsRepository))
  })

  it('deve devolver os grupos de contas do usuário autenticado no formato de resposta', async () => {
    const ownerId = new UniqueEntityID()
    const accountGroup = makeAccountGroup({ ownerId, name: 'Contas' })

    await accountGroupsRepository.create(accountGroup)
    accountGroupsRepository.accountsCountByAccountGroupId.set(accountGroup.id.toString(), 4)

    const response = await sut.handle({ id: ownerId.toString() }, {})

    expect(response.accountGroups).toEqual([
      {
        id: accountGroup.id.toString(),
        name: 'Contas',
        type: 'DEFAULT',
        accountsCount: 4,
        createdAt: accountGroup.createdAt,
        updatedAt: null,
      },
    ])
  })

  it('deve devolver apenas os grupos de contas do tipo informado na query (RN015)', async () => {
    const ownerId = new UniqueEntityID()

    await accountGroupsRepository.create(makeAccountGroup({ ownerId, name: 'Contas', type: 'DEFAULT' }))
    await accountGroupsRepository.create(makeAccountGroup({ ownerId, name: 'Cartões', type: 'CREDIT_CARD' }))

    const response = await sut.handle({ id: ownerId.toString() }, { type: 'CREDIT_CARD' })

    expect(response.accountGroups).toHaveLength(1)
    expect(response.accountGroups[0].type).toBe('CREDIT_CARD')
  })

  it('deve devolver uma lista vazia quando o usuário autenticado não possui grupos de contas', async () => {
    await accountGroupsRepository.create(makeAccountGroup())

    const response = await sut.handle({ id: new UniqueEntityID().toString() }, {})

    expect(response.accountGroups).toEqual([])
  })

  it('deve ignorar o dono informado na query e listar os grupos de contas do usuário do token (RN010, RN011)', async () => {
    const ownerId = new UniqueEntityID()
    const anotherOwnerId = new UniqueEntityID()

    await accountGroupsRepository.create(makeAccountGroup({ ownerId, name: 'Contas' }))
    await accountGroupsRepository.create(makeAccountGroup({ ownerId: anotherOwnerId, name: 'Contas de outro usuário' }))

    const forgedQuery = Object.assign({ type: 'DEFAULT' as const }, { ownerId: anotherOwnerId.toString() })

    const response = await sut.handle({ id: ownerId.toString() }, forgedQuery)

    expect(response.accountGroups).toHaveLength(1)
    expect(response.accountGroups[0].name).toBe('Contas')
  })
})
