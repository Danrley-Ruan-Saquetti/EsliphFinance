import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { ListAssetGroupsUseCase } from '@domain/asset-group/application/use-cases/list-asset-groups'
import { InMemoryAssetGroupsRepository } from '@infra/database/in-memory/in-memory-asset-groups-repository'
import { ListAssetGroupsController } from '@infra/http/controllers/list-asset-groups.controller'
import { makeAssetGroup } from '@tests/factories/make-asset-group'

let assetGroupsRepository: InMemoryAssetGroupsRepository
let sut: ListAssetGroupsController

describe('ListAssetGroupsController', () => {
  beforeEach(() => {
    assetGroupsRepository = new InMemoryAssetGroupsRepository()
    sut = new ListAssetGroupsController(new ListAssetGroupsUseCase(assetGroupsRepository))
  })

  it('deve devolver os grupos de ativos do usuário autenticado no formato de resposta', async () => {
    const ownerId = new UniqueEntityID()
    const assetGroup = makeAssetGroup({ ownerId, name: 'Contas' })

    await assetGroupsRepository.create(assetGroup)
    assetGroupsRepository.assetsCountByAssetGroupId.set(assetGroup.id.toString(), 4)

    const response = await sut.handle({ id: ownerId.toString() }, {})

    expect(response.assetGroups).toEqual([
      {
        id: assetGroup.id.toString(),
        name: 'Contas',
        type: 'DEFAULT',
        assetsCount: 4,
        createdAt: assetGroup.createdAt,
        updatedAt: null,
      },
    ])
  })

  it('deve devolver apenas os grupos de ativos do tipo informado na query (RN015)', async () => {
    const ownerId = new UniqueEntityID()

    await assetGroupsRepository.create(makeAssetGroup({ ownerId, name: 'Contas', type: 'DEFAULT' }))
    await assetGroupsRepository.create(makeAssetGroup({ ownerId, name: 'Cartões', type: 'CREDIT_CARD' }))

    const response = await sut.handle({ id: ownerId.toString() }, { type: 'CREDIT_CARD' })

    expect(response.assetGroups).toHaveLength(1)
    expect(response.assetGroups[0].type).toBe('CREDIT_CARD')
  })

  it('deve devolver uma lista vazia quando o usuário autenticado não possui grupos de ativos', async () => {
    await assetGroupsRepository.create(makeAssetGroup())

    const response = await sut.handle({ id: new UniqueEntityID().toString() }, {})

    expect(response.assetGroups).toEqual([])
  })

  it('deve ignorar o dono informado na query e listar os grupos de ativos do usuário do token (RN010, RN011)', async () => {
    const ownerId = new UniqueEntityID()
    const anotherOwnerId = new UniqueEntityID()

    await assetGroupsRepository.create(makeAssetGroup({ ownerId, name: 'Contas' }))
    await assetGroupsRepository.create(makeAssetGroup({ ownerId: anotherOwnerId, name: 'Contas de outro usuário' }))

    const forgedQuery = Object.assign({ type: 'DEFAULT' as const }, { ownerId: anotherOwnerId.toString() })

    const response = await sut.handle({ id: ownerId.toString() }, forgedQuery)

    expect(response.assetGroups).toHaveLength(1)
    expect(response.assetGroups[0].name).toBe('Contas')
  })
})
