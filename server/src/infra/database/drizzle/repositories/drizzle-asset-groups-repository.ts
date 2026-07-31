import { Injectable } from '@nestjs/common'
import { and, asc, eq } from 'drizzle-orm'

import {
  AssetGroupWithAssetsCount,
  AssetGroupsRepository,
  FindManyAssetGroupsFilters,
} from '@domain/asset-group/application/repositories/asset-groups-repository'
import { AssetGroup } from '@domain/asset-group/enterprise/entities/asset-group'
import { DrizzleService } from '@infra/database/drizzle/drizzle.service'
import { AssetGroupRecord, DrizzleAssetGroupMapper } from '@infra/database/drizzle/mappers/drizzle-asset-group-mapper'
import { assetGroups } from '@infra/database/drizzle/schemas/asset-groups'

@Injectable()
export class DrizzleAssetGroupsRepository extends AssetGroupsRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super()
  }

  async create(assetGroup: AssetGroup): Promise<void> {
    await this.drizzle.db.insert(assetGroups).values(DrizzleAssetGroupMapper.toPersistence(assetGroup))
  }

  async findById(id: string): Promise<AssetGroupWithAssetsCount | null> {
    const [record] = await this.drizzle.db.select().from(assetGroups).where(eq(assetGroups.id, id)).limit(1)

    if (!record) {
      return null
    }

    return this.withAssetsCount(record)
  }

  async findManyByOwnerId(ownerId: string, filters: FindManyAssetGroupsFilters = {}): Promise<AssetGroupWithAssetsCount[]> {
    const conditions = [eq(assetGroups.ownerId, ownerId)]

    if (filters.type) {
      conditions.push(eq(assetGroups.type, filters.type))
    }

    const records = await this.drizzle.db
      .select()
      .from(assetGroups)
      .where(and(...conditions))
      .orderBy(asc(assetGroups.name))

    return records.map(record => this.withAssetsCount(record))
  }

  private withAssetsCount(record: AssetGroupRecord): AssetGroupWithAssetsCount {
    return { assetGroup: DrizzleAssetGroupMapper.toDomain(record), assetsCount: 0 }
  }
}
