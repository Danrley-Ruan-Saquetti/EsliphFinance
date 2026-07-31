import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { ListAssetGroupsUseCase } from '@domain/asset-group/application/use-cases/list-asset-groups'
import { InMemoryAssetGroupsRepository } from '@infra/database/in-memory/in-memory-asset-groups-repository'
import { makeAssetGroup } from '@tests/factories/make-asset-group'

let assetGroupsRepository: InMemoryAssetGroupsRepository
let sut: ListAssetGroupsUseCase

describe('Listar grupos de ativos', () => {
  beforeEach(() => {
    assetGroupsRepository = new InMemoryAssetGroupsRepository()
    sut = new ListAssetGroupsUseCase(assetGroupsRepository)
  })

  it('deve listar apenas os grupos de ativos do usuário informado (RN010, RN011)', async () => {
    const ownerId = new UniqueEntityID()

    await assetGroupsRepository.create(makeAssetGroup({ ownerId, name: 'Contas' }))
    await assetGroupsRepository.create(makeAssetGroup({ name: 'Contas de outro usuário' }))

    const result = await sut.execute({ ownerId: ownerId.toString() })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.assetGroups).toHaveLength(1)
      expect(result.value.assetGroups[0].assetGroup.name).toBe('Contas')
    }
  })

  it('deve listar os grupos de ativos do tipo informado quando o filtro por tipo for usado (RN015)', async () => {
    const ownerId = new UniqueEntityID()

    await assetGroupsRepository.create(makeAssetGroup({ ownerId, name: 'Contas', type: 'DEFAULT' }))
    await assetGroupsRepository.create(makeAssetGroup({ ownerId, name: 'Cartões', type: 'CREDIT_CARD' }))

    const result = await sut.execute({ ownerId: ownerId.toString(), type: 'CREDIT_CARD' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.assetGroups).toHaveLength(1)
      expect(result.value.assetGroups[0].assetGroup.type).toBe('CREDIT_CARD')
    }
  })

  it('deve listar os grupos de ativos de todos os tipos quando o filtro por tipo não for informado (RN015)', async () => {
    const ownerId = new UniqueEntityID()

    await assetGroupsRepository.create(makeAssetGroup({ ownerId, name: 'Contas', type: 'DEFAULT' }))
    await assetGroupsRepository.create(makeAssetGroup({ ownerId, name: 'Cartões', type: 'CREDIT_CARD' }))

    const result = await sut.execute({ ownerId: ownerId.toString() })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.assetGroups).toHaveLength(2)
    }
  })

  it('deve informar a quantidade de ativos vinculados a cada grupo de ativo', async () => {
    const ownerId = new UniqueEntityID()
    const assetGroupWithAssets = makeAssetGroup({ ownerId, name: 'Contas' })
    const assetGroupWithoutAssets = makeAssetGroup({ ownerId, name: 'Investimentos' })

    await assetGroupsRepository.create(assetGroupWithAssets)
    await assetGroupsRepository.create(assetGroupWithoutAssets)
    assetGroupsRepository.assetsCountByAssetGroupId.set(assetGroupWithAssets.id.toString(), 3)

    const result = await sut.execute({ ownerId: ownerId.toString() })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.assetGroups[0].assetsCount).toBe(3)
      expect(result.value.assetGroups[1].assetsCount).toBe(0)
    }
  })

  it('deve listar os grupos de ativos em ordem alfabética de nome', async () => {
    const ownerId = new UniqueEntityID()

    await assetGroupsRepository.create(makeAssetGroup({ ownerId, name: 'Investimentos' }))
    await assetGroupsRepository.create(makeAssetGroup({ ownerId, name: 'Cartões' }))
    await assetGroupsRepository.create(makeAssetGroup({ ownerId, name: 'Contas' }))

    const result = await sut.execute({ ownerId: ownerId.toString() })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.assetGroups.map(({ assetGroup }) => assetGroup.name)).toEqual(['Cartões', 'Contas', 'Investimentos'])
    }
  })

  it('deve devolver uma lista vazia quando o usuário não possui grupos de ativos', async () => {
    await assetGroupsRepository.create(makeAssetGroup())

    const result = await sut.execute({ ownerId: new UniqueEntityID().toString() })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.assetGroups).toEqual([])
    }
  })
})
