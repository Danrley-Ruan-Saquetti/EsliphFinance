import { InvariantError } from '@core/errors/invariant-error'
import { Money } from '@core/value-objects/money'
import { ValueObject } from '@core/value-objects/value-object'
import { BillingDay } from '@domain/account/enterprise/value-objects/billing-day'

export interface CreditCardSettingsProps {
  limit: Money
  closingDay: BillingDay
  dueDay: BillingDay
}

export interface CreditCardSettingsInput {
  limit: Money
  closingDay: number
  dueDay: number
}

export class CreditCardSettings extends ValueObject<CreditCardSettingsProps> {
  static create({ limit, closingDay, dueDay }: CreditCardSettingsInput): CreditCardSettings {
    return new CreditCardSettings({
      limit: CreditCardSettings.validateLimit(limit),
      closingDay: BillingDay.create(closingDay),
      dueDay: BillingDay.create(dueDay),
    })
  }

  private static validateLimit(limit: Money): Money {
    if (limit.amountInCents <= 0) {
      throw new InvariantError('O limite do cartão de crédito deve ser maior que zero')
    }

    return limit
  }

  get limit(): Money {
    return this.props.limit
  }

  get closingDay(): BillingDay {
    return this.props.closingDay
  }

  get dueDay(): BillingDay {
    return this.props.dueDay
  }
}
