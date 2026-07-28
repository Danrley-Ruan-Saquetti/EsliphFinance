import { Money } from '@core/value-objects/money'

export class MoneyPresenter {
  static toHTTP(money: Money) {
    return {
      amountInCents: money.amountInCents,
      formatted: money.toString(),
    }
  }
}
