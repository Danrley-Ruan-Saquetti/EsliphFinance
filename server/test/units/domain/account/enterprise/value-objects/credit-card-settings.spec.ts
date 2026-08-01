import { describe, expect, it } from 'vitest'

import { InvariantError } from '@core/errors/invariant-error'
import { Money } from '@core/value-objects/money'
import { CreditCardSettings } from '@domain/account/enterprise/value-objects/credit-card-settings'

describe('CreditCardSettings', () => {
  it('deve criar as configurações com o limite, o dia de fechamento e o dia de vencimento informados (RN019)', () => {
    const creditCard = CreditCardSettings.create({ limit: Money.fromCents(500000), closingDay: 20, dueDay: 28 })

    expect(creditCard.limit.amountInCents).toBe(500000)
    expect(creditCard.closingDay.day).toBe(20)
    expect(creditCard.dueDay.day).toBe(28)
  })

  it('deve lançar InvariantError quando o limite não for maior que zero (RN019)', () => {
    expect(() => CreditCardSettings.create({ limit: Money.zero(), closingDay: 20, dueDay: 28 })).toThrow(InvariantError)
    expect(() => CreditCardSettings.create({ limit: Money.fromCents(-500000), closingDay: 20, dueDay: 28 })).toThrow(InvariantError)
  })

  it('deve lançar InvariantError quando o dia de fechamento estiver fora do intervalo de 1 a 31 (RN020)', () => {
    expect(() => CreditCardSettings.create({ limit: Money.fromCents(500000), closingDay: 0, dueDay: 28 })).toThrow(InvariantError)
    expect(() => CreditCardSettings.create({ limit: Money.fromCents(500000), closingDay: 32, dueDay: 28 })).toThrow(InvariantError)
  })

  it('deve lançar InvariantError quando o dia de vencimento estiver fora do intervalo de 1 a 31 (RN020)', () => {
    expect(() => CreditCardSettings.create({ limit: Money.fromCents(500000), closingDay: 20, dueDay: 0 })).toThrow(InvariantError)
    expect(() => CreditCardSettings.create({ limit: Money.fromCents(500000), closingDay: 20, dueDay: 32 })).toThrow(InvariantError)
  })

  it('deve aceitar o dia de fechamento igual ao dia de vencimento (RN019)', () => {
    const creditCard = CreditCardSettings.create({ limit: Money.fromCents(500000), closingDay: 10, dueDay: 10 })

    expect(creditCard.closingDay.day).toBe(10)
    expect(creditCard.dueDay.day).toBe(10)
  })

  it('deve resolver o fechamento e o vencimento para o último dia do mês que não possui o dia configurado (RN020)', () => {
    const creditCard = CreditCardSettings.create({ limit: Money.fromCents(500000), closingDay: 30, dueDay: 31 })

    expect(creditCard.closingDay.resolveForMonth(2026, 2).toISOString()).toBe('2026-02-28T00:00:00.000Z')
    expect(creditCard.dueDay.resolveForMonth(2026, 2).toISOString()).toBe('2026-02-28T00:00:00.000Z')
  })
})
