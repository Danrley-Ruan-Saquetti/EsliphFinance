import { describe, expect, it } from 'vitest'

import { Money } from '@core/value-objects/money'
import { MoneyPresenter } from '@infra/http/presenters/money-presenter'

describe('MoneyPresenter', () => {
  it('deve expor o valor em centavos e formatado com duas casas decimais (RNF-0004)', () => {
    const result = MoneyPresenter.toHTTP(Money.fromCents(123456))

    expect(result).toEqual({ amountInCents: 123456, formatted: '1234.56' })
  })

  it('deve expor o valor negativo mantendo o sinal nas duas representações', () => {
    const result = MoneyPresenter.toHTTP(Money.fromCents(-500))

    expect(result).toEqual({ amountInCents: -500, formatted: '-5.00' })
  })

  it('deve expor o valor zero', () => {
    const result = MoneyPresenter.toHTTP(Money.zero())

    expect(result).toEqual({ amountInCents: 0, formatted: '0.00' })
  })
})
