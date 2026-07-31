import { AssetGroup } from '@domain/asset-group/enterprise/entities/asset-group'

export class AssetGroupPresenter {
  static toHTTP(assetGroup: AssetGroup, assetsCount: number) {
    return {
      id: assetGroup.id.toString(),
      name: assetGroup.name,
      type: assetGroup.type,
      assetsCount,
      createdAt: assetGroup.createdAt,
      updatedAt: assetGroup.updatedAt ?? null,
    }
  }
}
