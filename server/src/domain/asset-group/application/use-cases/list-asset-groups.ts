import { Either, right } from '@core/either'
import { UseCase } from '@core/use-case'
import { AssetGroupWithAssetsCount, AssetGroupsRepository } from '@domain/asset-group/application/repositories/asset-groups-repository'
import { AssetGroupType } from '@domain/asset-group/enterprise/value-objects/asset-group-type'

export interface ListAssetGroupsRequest {
  ownerId: string
  type?: AssetGroupType
}

export type ListAssetGroupsResponse = Either<never, { assetGroups: AssetGroupWithAssetsCount[] }>

export class ListAssetGroupsUseCase implements UseCase<ListAssetGroupsRequest, ListAssetGroupsResponse> {
  constructor(private readonly assetGroupsRepository: AssetGroupsRepository) {}

  async execute({ ownerId, type }: ListAssetGroupsRequest): Promise<ListAssetGroupsResponse> {
    const assetGroups = await this.assetGroupsRepository.findManyByOwnerId(ownerId, { type })

    return right({ assetGroups })
  }
}
