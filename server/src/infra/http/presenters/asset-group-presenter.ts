import { AssetGroup } from '@domain/asset-group/enterprise/entities/asset-group'

export class AssetGroupPresenter {
  static toHTTP(assetGroup: AssetGroup) {
    return {
      id: assetGroup.id.toString(),
      name: assetGroup.name,
      type: assetGroup.type,
      createdAt: assetGroup.createdAt,
      updatedAt: assetGroup.updatedAt ?? null,
    }
  }
}
