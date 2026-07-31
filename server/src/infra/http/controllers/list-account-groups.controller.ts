import { Controller, Get, Query } from '@nestjs/common'
import { z } from 'zod'

import { ListAccountGroupsUseCase } from '@domain/account-group/application/use-cases/list-account-groups'
import { ACCOUNT_GROUP_TYPES } from '@domain/account-group/enterprise/value-objects/account-group-type'
import type { AuthenticatedUser } from '@infra/auth/authenticated-user'
import { CurrentUser } from '@infra/auth/current-user-decorator'
import { ZodValidationPipe } from '@infra/http/pipes/zod-validation-pipe'
import { AccountGroupPresenter } from '@infra/http/presenters/account-group-presenter'

const listAccountGroupsQuerySchema = z.object({ type: z.enum(ACCOUNT_GROUP_TYPES).optional() })

type ListAccountGroupsQuery = z.infer<typeof listAccountGroupsQuerySchema>

@Controller('/account-groups')
export class ListAccountGroupsController {
  constructor(private readonly listAccountGroups: ListAccountGroupsUseCase) {}

  @Get()
  async handle(@CurrentUser() currentUser: AuthenticatedUser, @Query(new ZodValidationPipe(listAccountGroupsQuerySchema)) query: ListAccountGroupsQuery) {
    const result = await this.listAccountGroups.execute({ ...query, ownerId: currentUser.id })

    return { accountGroups: result.value.accountGroups.map(({ accountGroup, accountsCount }) => AccountGroupPresenter.toHTTP(accountGroup, accountsCount)) }
  }
}
