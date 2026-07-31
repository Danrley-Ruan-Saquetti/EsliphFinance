import { Account } from '@domain/account/enterprise/entities/account'
import { MoneyPresenter } from '@infra/http/presenters/money-presenter'

export class AccountPresenter {
  static toHTTP(account: Account) {
    return {
      id: account.id.toString(),
      accountGroupId: account.accountGroupId.toString(),
      name: account.name,
      initialBalance: MoneyPresenter.toHTTP(account.initialBalance),
      icon: account.icon,
      color: account.color,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt ?? null,
    }
  }
}
