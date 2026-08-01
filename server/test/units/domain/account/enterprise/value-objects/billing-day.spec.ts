import { describe, expect, it } from 'vitest'

import { InvariantError } from '@core/errors/invariant-error'
import { BillingDay } from '@domain/account/enterprise/value-objects/billing-day'

describe('BillingDay', () => {
  it('deve criar o dia de faturamento com o dia informado (RN019)', () => {
    const billingDay = BillingDay.create(15)

    expect(billingDay.day).toBe(15)
  })

  it('deve aceitar os dias nos limites do intervalo permitido (RN020)', () => {
    expect(BillingDay.create(BillingDay.MIN_DAY).day).toBe(1)
    expect(BillingDay.create(BillingDay.MAX_DAY).day).toBe(31)
  })

  it('deve lançar InvariantError quando o dia estiver fora do intervalo de 1 a 31 (RN020)', () => {
    expect(() => BillingDay.create(0)).toThrow(InvariantError)
    expect(() => BillingDay.create(32)).toThrow(InvariantError)
    expect(() => BillingDay.create(-1)).toThrow(InvariantError)
  })

  it('deve lançar InvariantError quando o dia não for um número inteiro (RN020)', () => {
    expect(() => BillingDay.create(15.5)).toThrow(InvariantError)
    expect(() => BillingDay.create(Number.NaN)).toThrow(InvariantError)
  })

  it('deve resolver a data no próprio dia quando o mês o possuir (RN020)', () => {
    const billingDay = BillingDay.create(15)

    expect(billingDay.resolveForMonth(2026, 3).toISOString()).toBe('2026-03-15T00:00:00.000Z')
  })

  it('deve ajustar o dia 31 para o último dia do mês de 28 dias (RN020)', () => {
    const billingDay = BillingDay.create(31)

    expect(billingDay.resolveForMonth(2026, 2).toISOString()).toBe('2026-02-28T00:00:00.000Z')
  })

  it('deve ajustar o dia 31 para o último dia do mês de 29 dias (RN020)', () => {
    const billingDay = BillingDay.create(31)

    expect(billingDay.resolveForMonth(2028, 2).toISOString()).toBe('2028-02-29T00:00:00.000Z')
  })

  it('deve ajustar o dia 31 para o último dia do mês de 30 dias (RN020)', () => {
    const billingDay = BillingDay.create(31)

    expect(billingDay.resolveForMonth(2026, 4).toISOString()).toBe('2026-04-30T00:00:00.000Z')
  })

  it('deve manter o dia 31 no mês de 31 dias (RN020)', () => {
    const billingDay = BillingDay.create(31)

    expect(billingDay.resolveForMonth(2026, 1).toISOString()).toBe('2026-01-31T00:00:00.000Z')
  })

  it('deve ajustar o dia 29 para o último dia de fevereiro no ano não bissexto (RN020)', () => {
    const billingDay = BillingDay.create(29)

    expect(billingDay.resolveForMonth(2026, 2).toISOString()).toBe('2026-02-28T00:00:00.000Z')
    expect(billingDay.resolveForMonth(2028, 2).toISOString()).toBe('2028-02-29T00:00:00.000Z')
  })

  it('deve lançar InvariantError quando o mês estiver fora do intervalo de 1 a 12', () => {
    const billingDay = BillingDay.create(10)

    expect(() => billingDay.resolveForMonth(2026, 0)).toThrow(InvariantError)
    expect(() => billingDay.resolveForMonth(2026, 13)).toThrow(InvariantError)
  })

  it('deve considerar iguais dois dias de faturamento com o mesmo dia', () => {
    expect(BillingDay.create(10).equals(BillingDay.create(10))).toBe(true)
    expect(BillingDay.create(10).equals(BillingDay.create(11))).toBe(false)
  })
})
