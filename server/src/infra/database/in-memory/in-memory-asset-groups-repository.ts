import { Injectable } from '@nestjs/common'

import {
  AssetGroupWithAssetsCount,
  AssetGroupsRepository,
  FindManyAssetGroupsFilters,
} from '@domain/asset-group/application/repositories/asset-groups-repository'
import { AssetGroup } from '@domain/asset-group/enterprise/entities/asset-group'

@Injectable()
export class InMemoryAssetGroupsRepository extends AssetGroupsRepository {
  readonly items: AssetGroup[] = []
  readonly assetsCountByAssetGroupId = new Map<string, number>()

  create(assetGroup: AssetGroup): Promise<void> {
    this.items.push(assetGroup)

    return Promise.resolve()
  }

  findById(id: string): Promise<AssetGroupWithAssetsCount | null> {
    const assetGroup = this.items.find(item => item.id.toString() === id)

    if (!assetGroup) {
      return Promise.resolve(null)
    }

    return Promise.resolve(this.withAssetsCount(assetGroup))
  }

  findManyByOwnerId(ownerId: string, filters: FindManyAssetGroupsFilters = {}): Promise<AssetGroupWithAssetsCount[]> {
    const assetGroups = this.items
      .filter(item => item.ownerId.toString() === ownerId)
      .filter(item => !filters.type || item.type === filters.type)
      .sort((first, second) => first.name.localeCompare(second.name))

    return Promise.resolve(assetGroups.map(assetGroup => this.withAssetsCount(assetGroup)))
  }

  private withAssetsCount(assetGroup: AssetGroup): AssetGroupWithAssetsCount {
    return { assetGroup, assetsCount: this.assetsCountByAssetGroupId.get(assetGroup.id.toString()) ?? 0 }
  }
}
