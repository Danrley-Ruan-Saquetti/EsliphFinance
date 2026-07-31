import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { GetAssetGroupUseCase } from '@domain/asset-group/application/use-cases/get-asset-group'
import { InMemoryAssetGroupsRepository } from '@infra/database/in-memory/in-memory-asset-groups-repository'
import { makeAssetGroup } from '@tests/factories/make-asset-group'

let assetGroupsRepository: InMemoryAssetGroupsRepository
let sut: GetAssetGroupUseCase

describe('Consultar grupo de ativo', () => {
  beforeEach(() => {
    assetGroupsRepository = new InMemoryAssetGroupsRepository()
    sut = new GetAssetGroupUseCase(assetGroupsRepository)
  })

  it('deve retornar o grupo de ativo do próprio dono', async () => {
    const ownerId = new UniqueEntityID()
    const assetGroup = makeAssetGroup({ ownerId, name: 'Cartões', type: 'CREDIT_CARD' })

    await assetGroupsRepository.create(assetGroup)

    const result = await sut.execute({ assetGroupId: assetGroup.id.toString(), ownerId: ownerId.toString() })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.assetGroup.name).toBe('Cartões')
      expect(result.value.assetGroup.type).toBe('CREDIT_CARD')
    }
  })

  it('deve informar a quantidade de ativos vinculados ao grupo de ativo', async () => {
    const ownerId = new UniqueEntityID()
    const assetGroup = makeAssetGroup({ ownerId })

    await assetGroupsRepository.create(assetGroup)
    assetGroupsRepository.assetsCountByAssetGroupId.set(assetGroup.id.toString(), 2)

    const result = await sut.execute({ assetGroupId: assetGroup.id.toString(), ownerId: ownerId.toString() })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.assetsCount).toBe(2)
    }
  })

  it('deve retornar ResourceNotFoundError quando o grupo de ativo não existe', async () => {
    const result = await sut.execute({ assetGroupId: new UniqueEntityID().toString(), ownerId: new UniqueEntityID().toString() })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(ResourceNotFoundError)
    }
  })

  it('deve retornar ResourceNotFoundError quando o grupo de ativo é de outro usuário (RN010, RN011)', async () => {
    const assetGroup = makeAssetGroup()

    await assetGroupsRepository.create(assetGroup)

    const result = await sut.execute({ assetGroupId: assetGroup.id.toString(), ownerId: new UniqueEntityID().toString() })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(ResourceNotFoundError)
    }
  })
})
