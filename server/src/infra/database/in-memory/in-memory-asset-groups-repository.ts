import { Injectable } from '@nestjs/common'

import { AssetGroupsRepository } from '@domain/asset-group/application/repositories/asset-groups-repository'
import { AssetGroup } from '@domain/asset-group/enterprise/entities/asset-group'

@Injectable()
export class InMemoryAssetGroupsRepository extends AssetGroupsRepository {
  readonly items: AssetGroup[] = []

  create(assetGroup: AssetGroup): Promise<void> {
    this.items.push(assetGroup)

    return Promise.resolve()
  }
}
