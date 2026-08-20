import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { z } from 'zod'

import { CreateTransferUseCase } from '@domain/transaction/application/use-cases/create-transfer'
import { TRANSACTION_STATUSES } from '@domain/transaction/enterprise/value-objects/transaction-status'
import type { AuthenticatedUser } from '@infra/auth/authenticated-user'
import { CurrentUser } from '@infra/auth/current-user-decorator'
import { ZodValidationPipe } from '@infra/http/pipes/zod-validation-pipe'
import { TransactionPresenter } from '@infra/http/presenters/transaction-presenter'
import { moneySchema } from '@infra/http/schemas/money-schema'

const createTransferBodySchema = z.object({
  sourceAccountId: z.uuid(),
  destinationAccountId: z.uuid(),
  status: z.enum(TRANSACTION_STATUSES).optional(),
  date: z.coerce.date(),
  amount: moneySchema,
  description: z.string().trim().min(1).optional(),
})

type CreateTransferBody = z.infer<typeof createTransferBodySchema>

@Controller('/transactions/transfers')
export class CreateTransferController {
  constructor(private readonly createTransfer: CreateTransferUseCase) {}

  @Post()
  @HttpCode(201)
  async handle(@CurrentUser() currentUser: AuthenticatedUser, @Body(new ZodValidationPipe(createTransferBodySchema)) body: CreateTransferBody) {
    const result = await this.createTransfer.execute({ ...body, ownerId: currentUser.id })

    if (result.isLeft()) {
      throw result.value
    }

    return { transaction: TransactionPresenter.toHTTP(result.value.transaction) }
  }
}
