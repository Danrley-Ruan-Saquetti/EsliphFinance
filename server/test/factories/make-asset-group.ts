import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { AssetGroup, AssetGroupProps } from '@domain/asset-group/enterprise/entities/asset-group'

export function makeAssetGroup(override: Partial<AssetGroupProps> = {}, id?: UniqueEntityID): AssetGroup {
  return AssetGroup.create({ ownerId: new UniqueEntityID(), name: 'Contas', type: 'DEFAULT', ...override }, id)
}
