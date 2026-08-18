import { Body, Controller, HttpCode, Param, Put } from '@nestjs/common'
import { z } from 'zod'

import { UpdateAccountGroupUseCase } from '@domain/account-group/application/use-cases/update-account-group'
import { AccountGroup } from '@domain/account-group/enterprise/entities/account-group'
import { ACCOUNT_GROUP_TYPES } from '@domain/account-group/enterprise/value-objects/account-group-type'
import type { AuthenticatedUser } from '@infra/auth/authenticated-user'
import { CurrentUser } from '@infra/auth/current-user-decorator'
import { ZodValidationPipe } from '@infra/http/pipes/zod-validation-pipe'
import { AccountGroupPresenter } from '@infra/http/presenters/account-group-presenter'

const updateAccountGroupParamsSchema = z.object({ id: z.uuid() })

const updateAccountGroupBodySchema = z.object({
  name: z.string().min(1).max(AccountGroup.NAME_MAX_LENGTH),
  type: z.enum(ACCOUNT_GROUP_TYPES),
})

type UpdateAccountGroupParams = z.infer<typeof updateAccountGroupParamsSchema>
type UpdateAccountGroupBody = z.infer<typeof updateAccountGroupBodySchema>

@Controller('/account-groups')
export class UpdateAccountGroupController {
  constructor(private readonly updateAccountGroup: UpdateAccountGroupUseCase) {}

  @Put('/:id')
  @HttpCode(200)
  async handle(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param(new ZodValidationPipe(updateAccountGroupParamsSchema)) params: UpdateAccountGroupParams,
    @Body(new ZodValidationPipe(updateAccountGroupBodySchema)) body: UpdateAccountGroupBody,
  ) {
    const result = await this.updateAccountGroup.execute({ accountGroupId: params.id, ownerId: currentUser.id, ...body })

    if (result.isLeft()) {
      throw result.value
    }

    return { accountGroup: AccountGroupPresenter.toHTTP(result.value.accountGroup, result.value.accountsCount) }
  }
}
