import { Account } from '@domain/account/enterprise/entities/account'

export abstract class AccountsRepository {
  abstract create(account: Account): Promise<void>

  abstract findById(id: string): Promise<Account | null>
}
