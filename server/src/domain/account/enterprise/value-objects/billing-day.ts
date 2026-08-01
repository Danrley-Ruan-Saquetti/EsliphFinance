import { InvariantError } from '@core/errors/invariant-error'
import { ValueObject } from '@core/value-objects/value-object'

export interface BillingDayProps {
  day: number
}

export class BillingDay extends ValueObject<BillingDayProps> {
  static readonly MIN_DAY = 1
  static readonly MAX_DAY = 31
  static readonly FIRST_MONTH = 1
  static readonly LAST_MONTH = 12

  static create(day: number): BillingDay {
    if (!Number.isInteger(day) || day < BillingDay.MIN_DAY || day > BillingDay.MAX_DAY) {
      throw new InvariantError(`O dia de faturamento deve ser um número inteiro entre ${BillingDay.MIN_DAY} e ${BillingDay.MAX_DAY}`)
    }

    return new BillingDay({ day })
  }

  private static lastDayOfMonth(year: number, month: number): number {
    return new Date(Date.UTC(year, month, 0)).getUTCDate()
  }

  get day(): number {
    return this.props.day
  }

  resolveForMonth(year: number, month: number): Date {
    if (!Number.isInteger(month) || month < BillingDay.FIRST_MONTH || month > BillingDay.LAST_MONTH) {
      throw new InvariantError(`O mês deve ser um número inteiro entre ${BillingDay.FIRST_MONTH} e ${BillingDay.LAST_MONTH}`)
    }

    const resolvedDay = Math.min(this.day, BillingDay.lastDayOfMonth(year, month))

    return new Date(Date.UTC(year, month - 1, resolvedDay))
  }
}
