import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { GetAssetGroupUseCase } from '@domain/asset-group/application/use-cases/get-asset-group'
import { InMemoryAssetGroupsRepository } from '@infra/database/in-memory/in-memory-asset-groups-repository'
import { GetAssetGroupController } from '@infra/http/controllers/get-asset-group.controller'
import { makeAssetGroup } from '@tests/factories/make-asset-group'

let assetGroupsRepository: InMemoryAssetGroupsRepository
let sut: GetAssetGroupController

describe('GetAssetGroupController', () => {
  beforeEach(() => {
    assetGroupsRepository = new InMemoryAssetGroupsRepository()
    sut = new GetAssetGroupController(new GetAssetGroupUseCase(assetGroupsRepository))
  })

  it('deve devolver o grupo de ativo do usuário autenticado no formato de resposta', async () => {
    const ownerId = new UniqueEntityID()
    const assetGroup = makeAssetGroup({ ownerId, name: 'Cartões', type: 'CREDIT_CARD' })

    await assetGroupsRepository.create(assetGroup)
    assetGroupsRepository.assetsCountByAssetGroupId.set(assetGroup.id.toString(), 2)

    const response = await sut.handle({ id: ownerId.toString() }, { id: assetGroup.id.toString() })

    expect(response.assetGroup).toEqual({
      id: assetGroup.id.toString(),
      name: 'Cartões',
      type: 'CREDIT_CARD',
      assetsCount: 2,
      createdAt: assetGroup.createdAt,
      updatedAt: null,
    })
  })

  it('deve propagar ResourceNotFoundError quando o grupo de ativo não existe', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }
    const params = { id: new UniqueEntityID().toString() }

    await expect(sut.handle(currentUser, params)).rejects.toBeInstanceOf(ResourceNotFoundError)
  })

  it('deve propagar ResourceNotFoundError quando o grupo de ativo é de outro usuário (RN010, RN011)', async () => {
    const assetGroup = makeAssetGroup()

    await assetGroupsRepository.create(assetGroup)

    const currentUser = { id: new UniqueEntityID().toString() }
    const params = { id: assetGroup.id.toString() }

    await expect(sut.handle(currentUser, params)).rejects.toBeInstanceOf(ResourceNotFoundError)
  })
})
