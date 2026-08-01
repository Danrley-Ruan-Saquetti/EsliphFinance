import { Money } from '@core/value-objects/money'
import { ListedAccount } from '@domain/account/application/use-cases/list-accounts'
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
      archivedAt: account.archivedAt ?? null,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt ?? null,
    }
  }

  static toListHTTP({ account, balance, availableLimit }: ListedAccount) {
    return {
      ...AccountPresenter.toHTTP(account),
      balance: balance ? MoneyPresenter.toHTTP(balance) : null,
      creditCard: account.creditCard ? AccountPresenter.toListedCreditCardHTTP(account.creditCard, availableLimit) : null,
    }
  }

  private static toCreditCardHTTP(creditCard: CreditCardSettings) {
    return {
      limit: MoneyPresenter.toHTTP(creditCard.limit),
      closingDay: creditCard.closingDay.day,
      dueDay: creditCard.dueDay.day,
    }
  }

  private static toListedCreditCardHTTP(creditCard: CreditCardSettings, availableLimit: Money | null) {
    return {
      ...AccountPresenter.toCreditCardHTTP(creditCard),
      availableLimit: availableLimit ? MoneyPresenter.toHTTP(availableLimit) : null,
    }
  }
}
