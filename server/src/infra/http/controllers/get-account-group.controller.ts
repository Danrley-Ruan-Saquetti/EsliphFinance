import { Controller, Get, Param } from '@nestjs/common'
import { z } from 'zod'

import { GetAccountGroupUseCase } from '@domain/account-group/application/use-cases/get-account-group'
import type { AuthenticatedUser } from '@infra/auth/authenticated-user'
import { CurrentUser } from '@infra/auth/current-user-decorator'
import { ZodValidationPipe } from '@infra/http/pipes/zod-validation-pipe'
import { AccountGroupPresenter } from '@infra/http/presenters/account-group-presenter'

const getAccountGroupParamsSchema = z.object({ id: z.uuid() })

type GetAccountGroupParams = z.infer<typeof getAccountGroupParamsSchema>

@Controller('/account-groups')
export class GetAccountGroupController {
  constructor(private readonly getAccountGroup: GetAccountGroupUseCase) {}

  @Get('/:id')
  async handle(@CurrentUser() currentUser: AuthenticatedUser, @Param(new ZodValidationPipe(getAccountGroupParamsSchema)) params: GetAccountGroupParams) {
    const result = await this.getAccountGroup.execute({ accountGroupId: params.id, ownerId: currentUser.id })

    if (result.isLeft()) {
      throw result.value
    }

    return { accountGroup: AccountGroupPresenter.toHTTP(result.value.accountGroup, result.value.accountsCount) }
  }
}
