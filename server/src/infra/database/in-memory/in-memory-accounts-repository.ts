import { Injectable } from '@nestjs/common'

import { AccountGroupType } from '@domain/account-group/enterprise/value-objects/account-group-type'
import { AccountWithBalance, AccountsRepository, FindManyAccountsFilters } from '@domain/account/application/repositories/accounts-repository'
import { Account } from '@domain/account/enterprise/entities/account'
import { InMemoryAccountGroupsRepository } from '@infra/database/in-memory/in-memory-account-groups-repository'

@Injectable()
export class InMemoryAccountsRepository extends AccountsRepository {
  readonly items: Account[] = []

  constructor(private readonly accountGroupsRepository: InMemoryAccountGroupsRepository) {
    super()
  }

  create(account: Account): Promise<void> {
    this.items.push(account)

    return Promise.resolve()
  }

  findById(id: string): Promise<Account | null> {
    const account = this.items.find(item => item.id.toString() === id)

    return Promise.resolve(account ?? null)
  }

  findManyByOwnerId(ownerId: string, filters: FindManyAccountsFilters = {}): Promise<AccountWithBalance[]> {
    const accounts = this.items
      .filter(item => item.ownerId.toString() === ownerId)
      .filter(item => !filters.accountGroupId || item.accountGroupId.toString() === filters.accountGroupId)
      .filter(item => !filters.accountGroupType || this.isFromGroupType(item, filters.accountGroupType))
      .filter(item => filters.archived === undefined || item.isArchived === filters.archived)
      .sort((first, second) => first.name.localeCompare(second.name))

    return Promise.resolve(accounts.map(account => ({ account, balance: account.initialBalance })))
  }

  private isFromGroupType(account: Account, accountGroupType: AccountGroupType): boolean {
    const accountGroup = this.accountGroupsRepository.items.find(item => item.id.toString() === account.accountGroupId.toString())

    return accountGroup?.type === accountGroupType
  }
}
