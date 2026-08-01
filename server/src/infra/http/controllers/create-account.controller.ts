import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { z } from 'zod'

import { CreateAccountUseCase } from '@domain/account/application/use-cases/create-account'
import { Account } from '@domain/account/enterprise/entities/account'
import { BillingDay } from '@domain/account/enterprise/value-objects/billing-day'
import type { AuthenticatedUser } from '@infra/auth/authenticated-user'
import { CurrentUser } from '@infra/auth/current-user-decorator'
import { ZodValidationPipe } from '@infra/http/pipes/zod-validation-pipe'
import { AccountPresenter } from '@infra/http/presenters/account-presenter'
import { moneySchema } from '@infra/http/schemas/money-schema'

const billingDayMessage = `O dia deve ser um número inteiro entre ${BillingDay.MIN_DAY} e ${BillingDay.MAX_DAY}`

const billingDaySchema = z.int(billingDayMessage).min(BillingDay.MIN_DAY, billingDayMessage).max(BillingDay.MAX_DAY, billingDayMessage)

const createAccountBodySchema = z.object({
  accountGroupId: z.uuid(),
  name: z.string().min(1).max(Account.NAME_MAX_LENGTH),
  initialBalance: moneySchema.optional(),
  icon: z.string().min(1).max(Account.ICON_MAX_LENGTH).optional(),
  color: z.string().regex(Account.COLOR_PATTERN, 'A cor deve estar no formato hexadecimal #RRGGBB'),
  creditCard: z
    .object({
      limit: moneySchema,
      closingDay: billingDaySchema,
      dueDay: billingDaySchema,
    })
    .optional(),
})

type CreateAccountBody = z.infer<typeof createAccountBodySchema>

@Controller('/accounts')
export class CreateAccountController {
  constructor(private readonly createAccount: CreateAccountUseCase) {}

  @Post()
  @HttpCode(201)
  async handle(@CurrentUser() currentUser: AuthenticatedUser, @Body(new ZodValidationPipe(createAccountBodySchema)) body: CreateAccountBody) {
    const result = await this.createAccount.execute({ ...body, ownerId: currentUser.id })

    if (result.isLeft()) {
      throw result.value
    }

    return { account: AccountPresenter.toHTTP(result.value.account) }
  }
}
