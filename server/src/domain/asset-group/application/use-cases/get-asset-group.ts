import { Either, left, right } from '@core/either'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { UseCase } from '@core/use-case'
import { AssetGroupWithAssetsCount, AssetGroupsRepository } from '@domain/asset-group/application/repositories/asset-groups-repository'
import { AssetGroup } from '@domain/asset-group/enterprise/entities/asset-group'

export interface GetAssetGroupRequest {
  assetGroupId: string
  ownerId: string
}

export type GetAssetGroupResponse = Either<ResourceNotFoundError, AssetGroupWithAssetsCount>

export class GetAssetGroupUseCase implements UseCase<GetAssetGroupRequest, GetAssetGroupResponse> {
  constructor(private readonly assetGroupsRepository: AssetGroupsRepository) {}

  async execute({ assetGroupId, ownerId }: GetAssetGroupRequest): Promise<GetAssetGroupResponse> {
    const found = await this.assetGroupsRepository.findById(assetGroupId)

    if (!found || !this.isOwnedBy(found.assetGroup, ownerId)) {
      return left(new ResourceNotFoundError('Grupo de ativo não encontrado'))
    }

    return right(found)
  }

  private isOwnedBy(assetGroup: AssetGroup, ownerId: string): boolean {
    return assetGroup.ownerId.toString() === ownerId
  }
}
