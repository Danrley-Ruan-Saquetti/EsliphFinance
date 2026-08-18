import { Controller, HttpCode, Param, Patch } from '@nestjs/common'
import { z } from 'zod'

import { UnarchiveAccountUseCase } from '@domain/account/application/use-cases/unarchive-account'
import type { AuthenticatedUser } from '@infra/auth/authenticated-user'
import { CurrentUser } from '@infra/auth/current-user-decorator'
import { ZodValidationPipe } from '@infra/http/pipes/zod-validation-pipe'
import { AccountPresenter } from '@infra/http/presenters/account-presenter'

const unarchiveAccountParamsSchema = z.object({ id: z.uuid() })

type UnarchiveAccountParams = z.infer<typeof unarchiveAccountParamsSchema>

@Controller('/accounts')
export class UnarchiveAccountController {
  constructor(private readonly unarchiveAccount: UnarchiveAccountUseCase) {}

  @Patch('/:id/unarchive')
  @HttpCode(200)
  async handle(@CurrentUser() currentUser: AuthenticatedUser, @Param(new ZodValidationPipe(unarchiveAccountParamsSchema)) params: UnarchiveAccountParams) {
    const result = await this.unarchiveAccount.execute({ accountId: params.id, ownerId: currentUser.id })

    if (result.isLeft()) {
      throw result.value
    }

    return { account: AccountPresenter.toHTTP(result.value.account) }
  }
}
