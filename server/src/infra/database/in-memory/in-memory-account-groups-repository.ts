import { Injectable } from '@nestjs/common'

import {
  AccountGroupWithAccountsCount,
  AccountGroupsRepository,
  FindManyAccountGroupsFilters,
} from '@domain/account-group/application/repositories/account-groups-repository'
import { AccountGroup } from '@domain/account-group/enterprise/entities/account-group'

@Injectable()
export class InMemoryAccountGroupsRepository extends AccountGroupsRepository {
  readonly items: AccountGroup[] = []
  readonly accountsCountByAccountGroupId = new Map<string, number>()

  create(accountGroup: AccountGroup): Promise<void> {
    this.items.push(accountGroup)

    return Promise.resolve()
  }

  findById(id: string): Promise<AccountGroupWithAccountsCount | null> {
    const accountGroup = this.items.find(item => item.id.toString() === id)

    if (!accountGroup) {
      return Promise.resolve(null)
    }

    return Promise.resolve(this.withAccountsCount(accountGroup))
  }

  findManyByOwnerId(ownerId: string, filters: FindManyAccountGroupsFilters = {}): Promise<AccountGroupWithAccountsCount[]> {
    const accountGroups = this.items
      .filter(item => item.ownerId.toString() === ownerId)
      .filter(item => !filters.type || item.type === filters.type)
      .sort((first, second) => first.name.localeCompare(second.name))

    return Promise.resolve(accountGroups.map(accountGroup => this.withAccountsCount(accountGroup)))
  }

  private withAccountsCount(accountGroup: AccountGroup): AccountGroupWithAccountsCount {
    return { accountGroup, accountsCount: this.accountsCountByAccountGroupId.get(accountGroup.id.toString()) ?? 0 }
  }
}
