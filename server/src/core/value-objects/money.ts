import { InvariantError } from '@core/errors/invariant-error'
import { ValueObject } from '@core/value-objects/value-object'

export interface MoneyProps {
  amountInCents: number
}

export class Money extends ValueObject<MoneyProps> {
  static readonly CENTS_IN_UNIT = 100
  static readonly FRACTION_DIGITS = 2

  static fromCents(amountInCents: number): Money {
    if (!Number.isSafeInteger(amountInCents)) {
      throw new InvariantError('Money amount must be a safe integer number of cents')
    }

    return new Money({ amountInCents })
  }

  static zero(): Money {
    return Money.fromCents(0)
  }

  private static roundToNearestCent(amount: number): number {
    return amount < 0 ? -Math.round(-amount) : Math.round(amount)
  }

  get amountInCents(): number {
    return this.props.amountInCents
  }

  add(other: Money): Money {
    return Money.fromCents(this.amountInCents + other.amountInCents)
  }

  subtract(other: Money): Money {
    return Money.fromCents(this.amountInCents - other.amountInCents)
  }

  multiply(factor: number): Money {
    return Money.fromCents(Money.roundToNearestCent(this.amountInCents * factor))
  }

  allocate(parts: number): Money[] {
    if (!Number.isInteger(parts) || parts < 1) {
      throw new InvariantError('Money must be allocated into a positive whole number of parts')
    }

    const share = Math.trunc(this.amountInCents / parts)
    const remainder = this.amountInCents - share * parts

    return Array.from({ length: parts }, (_, index) => Money.fromCents(index === 0 ? share + remainder : share))
  }

  toString(): string {
    const sign = this.amountInCents < 0 ? '-' : ''
    const absoluteAmount = Math.abs(this.amountInCents)
    const units = Math.trunc(absoluteAmount / Money.CENTS_IN_UNIT)
    const cents = absoluteAmount - units * Money.CENTS_IN_UNIT

    return `${sign}${units}.${cents.toString().padStart(Money.FRACTION_DIGITS, '0')}`
  }
}
