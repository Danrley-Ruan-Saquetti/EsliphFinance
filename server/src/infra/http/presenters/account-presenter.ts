import { Account } from '@domain/account/enterprise/entities/account'
import { CreditCardSettings } from '@domain/account/enterprise/value-objects/credit-card-settings'
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
      creditCard: account.creditCard ? AccountPresenter.toCreditCardHTTP(account.creditCard) : null,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt ?? null,
    }
  }

  private static toCreditCardHTTP(creditCard: CreditCardSettings) {
    return {
      limit: MoneyPresenter.toHTTP(creditCard.limit),
      closingDay: creditCard.closingDay.day,
      dueDay: creditCard.dueDay.day,
    }
  }
}
