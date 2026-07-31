import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { AssetGroup } from '@domain/asset-group/enterprise/entities/asset-group'
import { assetGroups } from '@infra/database/drizzle/schemas/asset-groups'

export type AssetGroupRecord = typeof assetGroups.$inferSelect
export type AssetGroupInsert = typeof assetGroups.$inferInsert

export class DrizzleAssetGroupMapper {
  static toDomain(record: AssetGroupRecord): AssetGroup {
    return AssetGroup.create(
      {
        ownerId: new UniqueEntityID(record.ownerId),
        name: record.name,
        type: record.type,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      },
      new UniqueEntityID(record.id),
    )
  }

  static toPersistence(assetGroup: AssetGroup): AssetGroupInsert {
    return {
      id: assetGroup.id.toString(),
      ownerId: assetGroup.ownerId.toString(),
      name: assetGroup.name,
      type: assetGroup.type,
      createdAt: assetGroup.createdAt,
      updatedAt: assetGroup.updatedAt ?? null,
    }
  }
}
