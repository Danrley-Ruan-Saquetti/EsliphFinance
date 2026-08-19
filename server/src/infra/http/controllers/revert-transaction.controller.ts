import { Controller, HttpCode, Param, Patch } from '@nestjs/common'
import { z } from 'zod'

import { RevertTransactionUseCase } from '@domain/transaction/application/use-cases/revert-transaction'
import type { AuthenticatedUser } from '@infra/auth/authenticated-user'
import { CurrentUser } from '@infra/auth/current-user-decorator'
import { ZodValidationPipe } from '@infra/http/pipes/zod-validation-pipe'
import { TransactionPresenter } from '@infra/http/presenters/transaction-presenter'

const revertTransactionParamsSchema = z.object({ id: z.uuid() })

type RevertTransactionParams = z.infer<typeof revertTransactionParamsSchema>

@Controller('/transactions')
export class RevertTransactionController {
  constructor(private readonly revertTransaction: RevertTransactionUseCase) {}

  @Patch('/:id/revert')
  @HttpCode(200)
  async handle(@CurrentUser() currentUser: AuthenticatedUser, @Param(new ZodValidationPipe(revertTransactionParamsSchema)) params: RevertTransactionParams) {
    const result = await this.revertTransaction.execute({ transactionId: params.id, ownerId: currentUser.id })

    if (result.isLeft()) {
      throw result.value
    }

    return { transaction: TransactionPresenter.toHTTP(result.value.transaction) }
  }
}
