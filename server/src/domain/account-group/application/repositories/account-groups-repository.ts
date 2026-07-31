import { AccountGroup } from '@domain/account-group/enterprise/entities/account-group'
import { AccountGroupType } from '@domain/account-group/enterprise/value-objects/account-group-type'

export interface AccountGroupWithAccountsCount {
  accountGroup: AccountGroup
  accountsCount: number
}

export interface FindManyAccountGroupsFilters {
  type?: AccountGroupType
}

export abstract class AccountGroupsRepository {
  abstract create(accountGroup: AccountGroup): Promise<void>

  abstract findById(id: string): Promise<AccountGroupWithAccountsCount | null>

  abstract findManyByOwnerId(ownerId: string, filters?: FindManyAccountGroupsFilters): Promise<AccountGroupWithAccountsCount[]>
}
