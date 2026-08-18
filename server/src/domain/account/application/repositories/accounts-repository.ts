import { Money } from '@core/value-objects/money'
import { AccountGroupType } from '@domain/account-group/enterprise/value-objects/account-group-type'
import { Account } from '@domain/account/enterprise/entities/account'

export interface AccountWithBalance {
  account: Account
  balance: Money
}

export interface FindManyAccountsFilters {
  accountGroupId?: string
  accountGroupType?: AccountGroupType
  archived?: boolean
}

export abstract class AccountsRepository {
  abstract create(account: Account): Promise<void>

  abstract save(account: Account): Promise<void>

  abstract delete(id: string): Promise<void>

  abstract findById(id: string): Promise<Account | null>

  abstract findManyByOwnerId(ownerId: string, filters?: FindManyAccountsFilters): Promise<AccountWithBalance[]>
}
