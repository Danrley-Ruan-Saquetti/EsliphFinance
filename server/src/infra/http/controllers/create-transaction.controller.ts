import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { z } from 'zod'

import { CreateTransactionUseCase } from '@domain/transaction/application/use-cases/create-transaction'
import { TRANSACTION_STATUSES } from '@domain/transaction/enterprise/value-objects/transaction-status'
import type { AuthenticatedUser } from '@infra/auth/authenticated-user'
import { CurrentUser } from '@infra/auth/current-user-decorator'
import { ZodValidationPipe } from '@infra/http/pipes/zod-validation-pipe'
import { TransactionPresenter } from '@infra/http/presenters/transaction-presenter'
import { moneySchema } from '@infra/http/schemas/money-schema'

const CREATABLE_TRANSACTION_TYPES = ['INCOME', 'EXPENSE'] as const

const createTransactionBodySchema = z.object({
  accountId: z.uuid(),
  categoryId: z.uuid(),
  type: z.enum(CREATABLE_TRANSACTION_TYPES),
  status: z.enum(TRANSACTION_STATUSES),
  date: z.coerce.date(),
  amount: moneySchema,
  description: z.string().trim().min(1).optional(),
})

type CreateTransactionBody = z.infer<typeof createTransactionBodySchema>

@Controller('/transactions')
export class CreateTransactionController {
  constructor(private readonly createTransaction: CreateTransactionUseCase) {}

  @Post()
  @HttpCode(201)
  async handle(@CurrentUser() currentUser: AuthenticatedUser, @Body(new ZodValidationPipe(createTransactionBodySchema)) body: CreateTransactionBody) {
    const result = await this.createTransaction.execute({ ...body, ownerId: currentUser.id })

    if (result.isLeft()) {
      throw result.value
    }

    return { transaction: TransactionPresenter.toHTTP(result.value.transaction) }
  }
}
