import { describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { AssetGroupRecord, DrizzleAssetGroupMapper } from '@infra/database/drizzle/mappers/drizzle-asset-group-mapper'
import { makeAssetGroup } from '@tests/factories/make-asset-group'

function makeRecord(override: Partial<AssetGroupRecord> = {}): AssetGroupRecord {
  return {
    id: new UniqueEntityID().toString(),
    ownerId: new UniqueEntityID().toString(),
    name: 'Contas',
    type: 'DEFAULT',
    createdAt: new Date('2026-01-15T12:00:00.000Z'),
    updatedAt: null,
    ...override,
  }
}

describe('DrizzleAssetGroupMapper', () => {
  it('deve converter o registro do banco em entidade preservando o identificador', () => {
    const record = makeRecord()

    const assetGroup = DrizzleAssetGroupMapper.toDomain(record)

    expect(assetGroup.id.toString()).toBe(record.id)
    expect(assetGroup.ownerId.toString()).toBe(record.ownerId)
    expect(assetGroup.name).toBe(record.name)
    expect(assetGroup.type).toBe(record.type)
    expect(assetGroup.createdAt).toEqual(record.createdAt)
    expect(assetGroup.updatedAt).toBeNull()
  })

  it('deve converter o registro do banco do tipo "Cartão de Crédito" (RN015)', () => {
    const assetGroup = DrizzleAssetGroupMapper.toDomain(makeRecord({ type: 'CREDIT_CARD' }))

    expect(assetGroup.type).toBe('CREDIT_CARD')
  })

  it('deve converter o registro do banco com data de atualização preenchida', () => {
    const updatedAt = new Date('2026-02-20T12:00:00.000Z')

    const assetGroup = DrizzleAssetGroupMapper.toDomain(makeRecord({ updatedAt }))

    expect(assetGroup.updatedAt).toEqual(updatedAt)
  })

  it('deve converter a entidade em registro de persistência', () => {
    const assetGroup = makeAssetGroup()

    const record = DrizzleAssetGroupMapper.toPersistence(assetGroup)

    expect(record).toEqual({
      id: assetGroup.id.toString(),
      ownerId: assetGroup.ownerId.toString(),
      name: assetGroup.name,
      type: assetGroup.type,
      createdAt: assetGroup.createdAt,
      updatedAt: null,
    })
  })

  it('deve manter a entidade equivalente ao percorrer os dois sentidos da conversão', () => {
    const record = makeRecord()

    expect(DrizzleAssetGroupMapper.toPersistence(DrizzleAssetGroupMapper.toDomain(record))).toEqual(record)
  })
})
