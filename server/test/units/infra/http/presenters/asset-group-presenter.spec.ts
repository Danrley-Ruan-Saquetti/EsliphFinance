import { describe, expect, it } from 'vitest'

import { AssetGroupPresenter } from '@infra/http/presenters/asset-group-presenter'
import { makeAssetGroup } from '@tests/factories/make-asset-group'

describe('AssetGroupPresenter', () => {
  it('deve expor o grupo de ativo com o identificador em texto', () => {
    const assetGroup = makeAssetGroup()

    const result = AssetGroupPresenter.toHTTP(assetGroup)

    expect(result).toEqual({
      id: assetGroup.id.toString(),
      name: assetGroup.name,
      type: assetGroup.type,
      createdAt: assetGroup.createdAt,
      updatedAt: null,
    })
  })

  it('deve expor o tipo "Cartão de Crédito" do grupo de ativo (RN015)', () => {
    const assetGroup = makeAssetGroup({ type: 'CREDIT_CARD' })

    expect(AssetGroupPresenter.toHTTP(assetGroup).type).toBe('CREDIT_CARD')
  })

  it('deve expor a data de atualização quando o grupo de ativo já foi alterado', () => {
    const updatedAt = new Date('2026-02-20T12:00:00.000Z')
    const assetGroup = makeAssetGroup({ updatedAt })

    expect(AssetGroupPresenter.toHTTP(assetGroup).updatedAt).toEqual(updatedAt)
  })
})
