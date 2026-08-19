import { Body, Controller, HttpCode, Param, Patch } from '@nestjs/common'
import { z } from 'zod'

import { SettleTransactionUseCase } from '@domain/transaction/application/use-cases/settle-transaction'
import type { AuthenticatedUser } from '@infra/auth/authenticated-user'
import { CurrentUser } from '@infra/auth/current-user-decorator'
import { ZodValidationPipe } from '@infra/http/pipes/zod-validation-pipe'
import { TransactionPresenter } from '@infra/http/presenters/transaction-presenter'

const settleTransactionParamsSchema = z.object({ id: z.uuid() })

const settleTransactionBodySchema = z.object({ date: z.coerce.date().optional() })

type SettleTransactionParams = z.infer<typeof settleTransactionParamsSchema>
type SettleTransactionBody = z.infer<typeof settleTransactionBodySchema>

@Controller('/transactions')
export class SettleTransactionController {
  constructor(private readonly settleTransaction: SettleTransactionUseCase) {}

  @Patch('/:id/settle')
  @HttpCode(200)
  async handle(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param(new ZodValidationPipe(settleTransactionParamsSchema)) params: SettleTransactionParams,
    @Body(new ZodValidationPipe(settleTransactionBodySchema)) body: SettleTransactionBody,
  ) {
    const result = await this.settleTransaction.execute({ transactionId: params.id, ownerId: currentUser.id, date: body.date })

    if (result.isLeft()) {
      throw result.value
    }

    return { transaction: TransactionPresenter.toHTTP(result.value.transaction) }
  }
}
