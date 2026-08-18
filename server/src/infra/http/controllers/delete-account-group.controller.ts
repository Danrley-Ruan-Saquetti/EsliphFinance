import { Controller, Delete, HttpCode, Param } from '@nestjs/common'
import { z } from 'zod'

import { DeleteAccountGroupUseCase } from '@domain/account-group/application/use-cases/delete-account-group'
import type { AuthenticatedUser } from '@infra/auth/authenticated-user'
import { CurrentUser } from '@infra/auth/current-user-decorator'
import { ZodValidationPipe } from '@infra/http/pipes/zod-validation-pipe'

const deleteAccountGroupParamsSchema = z.object({ id: z.uuid() })

type DeleteAccountGroupParams = z.infer<typeof deleteAccountGroupParamsSchema>

@Controller('/account-groups')
export class DeleteAccountGroupController {
  constructor(private readonly deleteAccountGroup: DeleteAccountGroupUseCase) {}

  @Delete('/:id')
  @HttpCode(204)
  async handle(@CurrentUser() currentUser: AuthenticatedUser, @Param(new ZodValidationPipe(deleteAccountGroupParamsSchema)) params: DeleteAccountGroupParams) {
    const result = await this.deleteAccountGroup.execute({ accountGroupId: params.id, ownerId: currentUser.id })

    if (result.isLeft()) {
      throw result.value
    }
  }
}
