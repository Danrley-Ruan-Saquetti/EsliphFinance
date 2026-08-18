import { Controller, HttpCode, Param, Patch } from '@nestjs/common'
import { z } from 'zod'

import { ArchiveAccountUseCase } from '@domain/account/application/use-cases/archive-account'
import type { AuthenticatedUser } from '@infra/auth/authenticated-user'
import { CurrentUser } from '@infra/auth/current-user-decorator'
import { ZodValidationPipe } from '@infra/http/pipes/zod-validation-pipe'
import { AccountPresenter } from '@infra/http/presenters/account-presenter'

const archiveAccountParamsSchema = z.object({ id: z.uuid() })

type ArchiveAccountParams = z.infer<typeof archiveAccountParamsSchema>

@Controller('/accounts')
export class ArchiveAccountController {
  constructor(private readonly archiveAccount: ArchiveAccountUseCase) {}

  @Patch('/:id/archive')
  @HttpCode(200)
  async handle(@CurrentUser() currentUser: AuthenticatedUser, @Param(new ZodValidationPipe(archiveAccountParamsSchema)) params: ArchiveAccountParams) {
    const result = await this.archiveAccount.execute({ accountId: params.id, ownerId: currentUser.id })

    if (result.isLeft()) {
      throw result.value
    }

    return { account: AccountPresenter.toHTTP(result.value.account) }
  }
}
