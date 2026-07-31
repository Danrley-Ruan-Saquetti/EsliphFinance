import { AssetGroup } from '@domain/asset-group/enterprise/entities/asset-group'

export abstract class AssetGroupsRepository {
  abstract create(assetGroup: AssetGroup): Promise<void>
}
