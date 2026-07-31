import { Either, right } from '@core/either'
import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { UseCase } from '@core/use-case'
import { AssetGroupsRepository } from '@domain/asset-group/application/repositories/asset-groups-repository'
import { AssetGroup } from '@domain/asset-group/enterprise/entities/asset-group'
import { AssetGroupType } from '@domain/asset-group/enterprise/value-objects/asset-group-type'

export interface CreateAssetGroupRequest {
  ownerId: string
  name: string
  type?: AssetGroupType
}

export type CreateAssetGroupResponse = Either<never, { assetGroup: AssetGroup }>

export class CreateAssetGroupUseCase implements UseCase<CreateAssetGroupRequest, CreateAssetGroupResponse> {
  constructor(private readonly assetGroupsRepository: AssetGroupsRepository) {}

  async execute({ ownerId, name, type }: CreateAssetGroupRequest): Promise<CreateAssetGroupResponse> {
    const assetGroup = AssetGroup.create({ ownerId: new UniqueEntityID(ownerId), name, type })

    await this.assetGroupsRepository.create(assetGroup)

    return right({ assetGroup })
  }
}
