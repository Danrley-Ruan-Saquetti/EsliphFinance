import { Controller, Delete, HttpCode, Param } from '@nestjs/common'
import { z } from 'zod'

import { DeleteAccountUseCase } from '@domain/account/application/use-cases/delete-account'
import type { AuthenticatedUser } from '@infra/auth/authenticated-user'
import { CurrentUser } from '@infra/auth/current-user-decorator'
import { ZodValidationPipe } from '@infra/http/pipes/zod-validation-pipe'

const deleteAccountParamsSchema = z.object({ id: z.uuid() })

type DeleteAccountParams = z.infer<typeof deleteAccountParamsSchema>

@Controller('/accounts')
export class DeleteAccountController {
  constructor(private readonly deleteAccount: DeleteAccountUseCase) {}

  @Delete('/:id')
  @HttpCode(204)
  async handle(@CurrentUser() currentUser: AuthenticatedUser, @Param(new ZodValidationPipe(deleteAccountParamsSchema)) params: DeleteAccountParams) {
    const result = await this.deleteAccount.execute({ accountId: params.id, ownerId: currentUser.id })

    if (result.isLeft()) {
      throw result.value
    }
  }
}
