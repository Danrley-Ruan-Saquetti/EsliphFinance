import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { z } from 'zod'

import { CreateAccountGroupUseCase } from '@domain/account-group/application/use-cases/create-account-group'
import { AccountGroup } from '@domain/account-group/enterprise/entities/account-group'
import { ACCOUNT_GROUP_TYPES } from '@domain/account-group/enterprise/value-objects/account-group-type'
import type { AuthenticatedUser } from '@infra/auth/authenticated-user'
import { CurrentUser } from '@infra/auth/current-user-decorator'
import { ZodValidationPipe } from '@infra/http/pipes/zod-validation-pipe'
import { AccountGroupPresenter } from '@infra/http/presenters/account-group-presenter'

const createAccountGroupBodySchema = z.object({
  name: z.string().min(1).max(AccountGroup.NAME_MAX_LENGTH),
  type: z.enum(ACCOUNT_GROUP_TYPES).optional(),
})

type CreateAccountGroupBody = z.infer<typeof createAccountGroupBodySchema>

@Controller('/account-groups')
export class CreateAccountGroupController {
  constructor(private readonly createAccountGroup: CreateAccountGroupUseCase) {}

  @Post()
  @HttpCode(201)
  async handle(@CurrentUser() currentUser: AuthenticatedUser, @Body(new ZodValidationPipe(createAccountGroupBodySchema)) body: CreateAccountGroupBody) {
    const result = await this.createAccountGroup.execute({ ...body, ownerId: currentUser.id })

    return { accountGroup: AccountGroupPresenter.toHTTP(result.value.accountGroup, 0) }
  }
}
