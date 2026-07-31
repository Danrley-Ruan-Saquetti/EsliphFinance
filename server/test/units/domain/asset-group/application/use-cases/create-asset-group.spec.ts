import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { InvariantError } from '@core/errors/invariant-error'
import { CreateAssetGroupUseCase } from '@domain/asset-group/application/use-cases/create-asset-group'
import { InMemoryAssetGroupsRepository } from '@infra/database/in-memory/in-memory-asset-groups-repository'

let assetGroupsRepository: InMemoryAssetGroupsRepository
let sut: CreateAssetGroupUseCase

describe('Criar grupo de ativo', () => {
  beforeEach(() => {
    assetGroupsRepository = new InMemoryAssetGroupsRepository()
    sut = new CreateAssetGroupUseCase(assetGroupsRepository)
  })

  it('deve criar o grupo de ativo e persisti-lo no repositório (RN016)', async () => {
    const ownerId = new UniqueEntityID().toString()

    const result = await sut.execute({ ownerId, name: 'Cartões', type: 'CREDIT_CARD' })

    expect(result.isRight()).toBe(true)
    expect(assetGroupsRepository.items).toHaveLength(1)
    expect(assetGroupsRepository.items[0].name).toBe('Cartões')
    expect(assetGroupsRepository.items[0].type).toBe('CREDIT_CARD')
  })

  it('deve criar o grupo de ativo com o tipo "Padrão" quando o tipo não for informado (RN016)', async () => {
    const result = await sut.execute({ ownerId: new UniqueEntityID().toString(), name: 'Contas' })

    expect(result.isRight()).toBe(true)
    expect(assetGroupsRepository.items[0].type).toBe('DEFAULT')
  })

  it('deve vincular o grupo de ativo ao usuário informado (RN010)', async () => {
    const ownerId = new UniqueEntityID().toString()

    await sut.execute({ ownerId, name: 'Contas' })

    expect(assetGroupsRepository.items[0].ownerId.toString()).toBe(ownerId)
  })

  it('deve lançar InvariantError quando o nome for vazio (RN016)', async () => {
    await expect(sut.execute({ ownerId: new UniqueEntityID().toString(), name: '   ' })).rejects.toThrow(InvariantError)

    expect(assetGroupsRepository.items).toHaveLength(0)
  })
})
