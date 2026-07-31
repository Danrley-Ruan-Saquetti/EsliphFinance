import { AccountGroup } from '@domain/account-group/enterprise/entities/account-group'

export class AccountGroupPresenter {
  static toHTTP(accountGroup: AccountGroup, accountsCount: number) {
    return {
      id: accountGroup.id.toString(),
      name: accountGroup.name,
      type: accountGroup.type,
      accountsCount,
      createdAt: accountGroup.createdAt,
      updatedAt: accountGroup.updatedAt ?? null,
    }
  }
}
