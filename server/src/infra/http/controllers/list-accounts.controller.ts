import { Controller, Get, Query } from '@nestjs/common'
import { z } from 'zod'

import { ACCOUNT_GROUP_TYPES } from '@domain/account-group/enterprise/value-objects/account-group-type'
import { ListAccountsUseCase } from '@domain/account/application/use-cases/list-accounts'
import type { AuthenticatedUser } from '@infra/auth/authenticated-user'
import { CurrentUser } from '@infra/auth/current-user-decorator'
import { ZodValidationPipe } from '@infra/http/pipes/zod-validation-pipe'
import { AccountPresenter } from '@infra/http/presenters/account-presenter'

const listAccountsQuerySchema = z.object({
  accountGroupId: z.uuid().optional(),
  accountGroupType: z.enum(ACCOUNT_GROUP_TYPES).optional(),
  archived: z.stringbool().optional(),
})

type ListAccountsQuery = z.infer<typeof listAccountsQuerySchema>

@Controller('/accounts')
export class ListAccountsController {
  constructor(private readonly listAccounts: ListAccountsUseCase) {}

  @Get()
  async handle(@CurrentUser() currentUser: AuthenticatedUser, @Query(new ZodValidationPipe(listAccountsQuerySchema)) query: ListAccountsQuery) {
    const result = await this.listAccounts.execute({ ...query, ownerId: currentUser.id })

    return { accounts: result.value.accounts.map(account => AccountPresenter.toListHTTP(account)) }
  }
}
