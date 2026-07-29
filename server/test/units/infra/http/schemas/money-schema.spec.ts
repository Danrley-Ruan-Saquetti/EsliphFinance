import { describe, expect, it } from 'vitest'

import { Money } from '@core/value-objects/money'
import { moneySchema } from '@infra/http/schemas/money-schema'

describe('moneySchema', () => {
  it('deve converter a entrada em centavos no objeto de valor monetário (RNF004)', () => {
    const money = moneySchema.parse(123456)

    expect(money).toBeInstanceOf(Money)
    expect(money.amountInCents).toBe(123456)
  })

  it('deve aceitar o valor zero e o valor negativo', () => {
    expect(moneySchema.parse(0).amountInCents).toBe(0)
    expect(moneySchema.parse(-500).amountInCents).toBe(-500)
  })

  it('deve rejeitar um valor fracionário (RNF004)', () => {
    const result = moneySchema.safeParse(10.5)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('O valor deve ser um número inteiro em centavos')
    }
  })

  it('deve rejeitar um valor em texto, sem coerção', () => {
    expect(moneySchema.safeParse('1000').success).toBe(false)
  })

  it('deve rejeitar um valor ausente', () => {
    expect(moneySchema.safeParse(undefined).success).toBe(false)
    expect(moneySchema.safeParse(null).success).toBe(false)
  })

  it('deve rejeitar um valor fora do inteiro seguro', () => {
    expect(moneySchema.safeParse(Number.MAX_SAFE_INTEGER + 1).success).toBe(false)
    expect(moneySchema.safeParse(Number.POSITIVE_INFINITY).success).toBe(false)
    expect(moneySchema.safeParse(Number.NaN).success).toBe(false)
  })
})
