import { Controller, Get, Query } from '@nestjs/common'
import { z } from 'zod'

import { ListAssetGroupsUseCase } from '@domain/asset-group/application/use-cases/list-asset-groups'
import { ASSET_GROUP_TYPES } from '@domain/asset-group/enterprise/value-objects/asset-group-type'
import type { AuthenticatedUser } from '@infra/auth/authenticated-user'
import { CurrentUser } from '@infra/auth/current-user-decorator'
import { ZodValidationPipe } from '@infra/http/pipes/zod-validation-pipe'
import { AssetGroupPresenter } from '@infra/http/presenters/asset-group-presenter'

const listAssetGroupsQuerySchema = z.object({ type: z.enum(ASSET_GROUP_TYPES).optional() })

type ListAssetGroupsQuery = z.infer<typeof listAssetGroupsQuerySchema>

@Controller('/asset-groups')
export class ListAssetGroupsController {
  constructor(private readonly listAssetGroups: ListAssetGroupsUseCase) {}

  @Get()
  async handle(@CurrentUser() currentUser: AuthenticatedUser, @Query(new ZodValidationPipe(listAssetGroupsQuerySchema)) query: ListAssetGroupsQuery) {
    const result = await this.listAssetGroups.execute({ ...query, ownerId: currentUser.id })

    return { assetGroups: result.value.assetGroups.map(({ assetGroup, assetsCount }) => AssetGroupPresenter.toHTTP(assetGroup, assetsCount)) }
  }
}
