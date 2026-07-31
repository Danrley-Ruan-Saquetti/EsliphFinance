import { Controller, Get, Param } from '@nestjs/common'
import { z } from 'zod'

import { GetAssetGroupUseCase } from '@domain/asset-group/application/use-cases/get-asset-group'
import type { AuthenticatedUser } from '@infra/auth/authenticated-user'
import { CurrentUser } from '@infra/auth/current-user-decorator'
import { ZodValidationPipe } from '@infra/http/pipes/zod-validation-pipe'
import { AssetGroupPresenter } from '@infra/http/presenters/asset-group-presenter'

const getAssetGroupParamsSchema = z.object({ id: z.uuid() })

type GetAssetGroupParams = z.infer<typeof getAssetGroupParamsSchema>

@Controller('/asset-groups')
export class GetAssetGroupController {
  constructor(private readonly getAssetGroup: GetAssetGroupUseCase) {}

  @Get('/:id')
  async handle(@CurrentUser() currentUser: AuthenticatedUser, @Param(new ZodValidationPipe(getAssetGroupParamsSchema)) params: GetAssetGroupParams) {
    const result = await this.getAssetGroup.execute({ assetGroupId: params.id, ownerId: currentUser.id })

    if (result.isLeft()) {
      throw result.value
    }

    return { assetGroup: AssetGroupPresenter.toHTTP(result.value.assetGroup, result.value.assetsCount) }
  }
}
