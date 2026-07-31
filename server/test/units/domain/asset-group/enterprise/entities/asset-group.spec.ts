import { describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { InvariantError } from '@core/errors/invariant-error'
import { AssetGroup } from '@domain/asset-group/enterprise/entities/asset-group'
import { AssetGroupType } from '@domain/asset-group/enterprise/value-objects/asset-group-type'

describe('AssetGroup', () => {
  it('deve criar o grupo de ativo com o nome e o tipo informados (RN015, RN016)', () => {
    const ownerId = new UniqueEntityID()

    const assetGroup = AssetGroup.create({ ownerId, name: 'Cartões', type: 'CREDIT_CARD' })

    expect(assetGroup.ownerId).toBe(ownerId)
    expect(assetGroup.name).toBe('Cartões')
    expect(assetGroup.type).toBe('CREDIT_CARD')
    expect(assetGroup.createdAt).toBeInstanceOf(Date)
    expect(assetGroup.updatedAt).toBeUndefined()
  })

  it('deve assumir o tipo "Padrão" quando o tipo não for informado (RN016)', () => {
    const assetGroup = AssetGroup.create({ ownerId: new UniqueEntityID(), name: 'Contas' })

    expect(assetGroup.type).toBe('DEFAULT')
  })

  it('deve remover os espaços das extremidades do nome', () => {
    const assetGroup = AssetGroup.create({ ownerId: new UniqueEntityID(), name: '  Contas  ' })

    expect(assetGroup.name).toBe('Contas')
  })

  it('deve lançar InvariantError quando o nome for vazio (RN016)', () => {
    expect(() => AssetGroup.create({ ownerId: new UniqueEntityID(), name: '   ' })).toThrow(InvariantError)
  })

  it('deve aceitar o nome com o tamanho máximo permitido', () => {
    const name = 'a'.repeat(AssetGroup.NAME_MAX_LENGTH)

    const assetGroup = AssetGroup.create({ ownerId: new UniqueEntityID(), name })

    expect(assetGroup.name).toBe(name)
  })

  it('deve lançar InvariantError quando o nome exceder o tamanho máximo', () => {
    const name = 'a'.repeat(AssetGroup.NAME_MAX_LENGTH + 1)

    expect(() => AssetGroup.create({ ownerId: new UniqueEntityID(), name })).toThrow(InvariantError)
  })

  it('deve lançar InvariantError quando o tipo estiver fora do domínio permitido (RN015)', () => {
    expect(() => AssetGroup.create({ ownerId: new UniqueEntityID(), name: 'Contas', type: 'INVESTMENT' as AssetGroupType })).toThrow(InvariantError)
  })
})
