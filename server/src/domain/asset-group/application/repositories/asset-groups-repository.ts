import { AssetGroup } from '@domain/asset-group/enterprise/entities/asset-group'
import { AssetGroupType } from '@domain/asset-group/enterprise/value-objects/asset-group-type'

export interface AssetGroupWithAssetsCount {
  assetGroup: AssetGroup
  assetsCount: number
}

export interface FindManyAssetGroupsFilters {
  type?: AssetGroupType
}

export abstract class AssetGroupsRepository {
  abstract create(assetGroup: AssetGroup): Promise<void>

  abstract findById(id: string): Promise<AssetGroupWithAssetsCount | null>

  abstract findManyByOwnerId(ownerId: string, filters?: FindManyAssetGroupsFilters): Promise<AssetGroupWithAssetsCount[]>
}
