import { Injectable } from '@nestjs/common'

import { AssetGroupsRepository } from '@domain/asset-group/application/repositories/asset-groups-repository'
import { AssetGroup } from '@domain/asset-group/enterprise/entities/asset-group'
import { DrizzleService } from '@infra/database/drizzle/drizzle.service'
import { DrizzleAssetGroupMapper } from '@infra/database/drizzle/mappers/drizzle-asset-group-mapper'
import { assetGroups } from '@infra/database/drizzle/schemas/asset-groups'

@Injectable()
export class DrizzleAssetGroupsRepository extends AssetGroupsRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super()
  }

  async create(assetGroup: AssetGroup): Promise<void> {
    await this.drizzle.db.insert(assetGroups).values(DrizzleAssetGroupMapper.toPersistence(assetGroup))
  }
}
