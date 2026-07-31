import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { z } from 'zod'

import { CreateAssetGroupUseCase } from '@domain/asset-group/application/use-cases/create-asset-group'
import { AssetGroup } from '@domain/asset-group/enterprise/entities/asset-group'
import { ASSET_GROUP_TYPES } from '@domain/asset-group/enterprise/value-objects/asset-group-type'
import type { AuthenticatedUser } from '@infra/auth/authenticated-user'
import { CurrentUser } from '@infra/auth/current-user-decorator'
import { ZodValidationPipe } from '@infra/http/pipes/zod-validation-pipe'
import { AssetGroupPresenter } from '@infra/http/presenters/asset-group-presenter'

const createAssetGroupBodySchema = z.object({
  name: z.string().min(1).max(AssetGroup.NAME_MAX_LENGTH),
  type: z.enum(ASSET_GROUP_TYPES).optional(),
})

type CreateAssetGroupBody = z.infer<typeof createAssetGroupBodySchema>

@Controller('/asset-groups')
export class CreateAssetGroupController {
  constructor(private readonly createAssetGroup: CreateAssetGroupUseCase) {}

  @Post()
  @HttpCode(201)
  async handle(@CurrentUser() currentUser: AuthenticatedUser, @Body(new ZodValidationPipe(createAssetGroupBodySchema)) body: CreateAssetGroupBody) {
    const result = await this.createAssetGroup.execute({ ...body, ownerId: currentUser.id })

    return { assetGroup: AssetGroupPresenter.toHTTP(result.value.assetGroup) }
  }
}
