import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { CreateAssetGroupUseCase } from '@domain/asset-group/application/use-cases/create-asset-group'
import { InMemoryAssetGroupsRepository } from '@infra/database/in-memory/in-memory-asset-groups-repository'
import { CreateAssetGroupController } from '@infra/http/controllers/create-asset-group.controller'

let assetGroupsRepository: InMemoryAssetGroupsRepository
let sut: CreateAssetGroupController

describe('CreateAssetGroupController', () => {
  beforeEach(() => {
    assetGroupsRepository = new InMemoryAssetGroupsRepository()
    sut = new CreateAssetGroupController(new CreateAssetGroupUseCase(assetGroupsRepository))
  })

  it('deve devolver o grupo de ativo criado, sem nenhum ativo vinculado, no formato de resposta', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }

    const response = await sut.handle(currentUser, { name: 'Cartões', type: 'CREDIT_CARD' })

    expect(response.assetGroup).toEqual({
      id: assetGroupsRepository.items[0].id.toString(),
      name: 'Cartões',
      type: 'CREDIT_CARD',
      assetsCount: 0,
      createdAt: assetGroupsRepository.items[0].createdAt,
      updatedAt: null,
    })
  })

  it('deve criar o grupo de ativo com o tipo "Padrão" quando o tipo não for informado (RN016)', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }

    const response = await sut.handle(currentUser, { name: 'Contas' })

    expect(response.assetGroup.type).toBe('DEFAULT')
  })

  it('deve persistir o grupo de ativo vinculado ao usuário autenticado (RN010)', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }

    await sut.handle(currentUser, { name: 'Contas' })

    expect(assetGroupsRepository.items).toHaveLength(1)
    expect(assetGroupsRepository.items[0].ownerId.toString()).toBe(currentUser.id)
  })

  it('deve ignorar o dono informado no corpo e vincular o grupo de ativo ao usuário do token (RN010, RN011)', async () => {
    const currentUser = { id: new UniqueEntityID().toString() }
    const forgedBody = Object.assign({ name: 'Contas' }, { ownerId: new UniqueEntityID().toString() })

    await sut.handle(currentUser, forgedBody)

    expect(assetGroupsRepository.items[0].ownerId.toString()).toBe(currentUser.id)
  })
})
