import { describe, expect, it } from 'vitest'

import { Money } from '@core/value-objects/money'
import { AccountPresenter } from '@infra/http/presenters/account-presenter'
import { makeAccount } from '@tests/factories/make-account'

describe('AccountPresenter', () => {
  it('deve expor a conta com os identificadores em texto', () => {
    const account = makeAccount()

    const result = AccountPresenter.toHTTP(account)

    expect(result).toEqual({
      id: account.id.toString(),
      accountGroupId: account.accountGroupId.toString(),
      name: account.name,
      initialBalance: { amountInCents: 0, formatted: '0.00' },
      icon: account.icon,
      color: account.color,
      createdAt: account.createdAt,
      updatedAt: null,
    })
  })

  it('deve expor o saldo inicial em centavos e formatado (RNF004)', () => {
    const account = makeAccount({ initialBalance: Money.fromCents(123456) })

    expect(AccountPresenter.toHTTP(account).initialBalance).toEqual({ amountInCents: 123456, formatted: '1234.56' })
  })

  it('deve expor o saldo inicial negativo (RN018)', () => {
    const account = makeAccount({ initialBalance: Money.fromCents(-25050) })

    expect(AccountPresenter.toHTTP(account).initialBalance).toEqual({ amountInCents: -25050, formatted: '-250.50' })
  })

  it('deve expor a data de atualização quando a conta já foi alterada', () => {
    const updatedAt = new Date('2026-02-20T12:00:00.000Z')
    const account = makeAccount({ updatedAt })

    expect(AccountPresenter.toHTTP(account).updatedAt).toEqual(updatedAt)
  })
})
