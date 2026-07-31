import { describe, expect, it } from 'vitest'

import { AccountGroupPresenter } from '@infra/http/presenters/account-group-presenter'
import { makeAccountGroup } from '@tests/factories/make-account-group'

describe('AccountGroupPresenter', () => {
  it('deve expor o grupo de contas com o identificador em texto', () => {
    const accountGroup = makeAccountGroup()

    const result = AccountGroupPresenter.toHTTP(accountGroup, 0)

    expect(result).toEqual({
      id: accountGroup.id.toString(),
      name: accountGroup.name,
      type: accountGroup.type,
      accountsCount: 0,
      createdAt: accountGroup.createdAt,
      updatedAt: null,
    })
  })

  it('deve expor o tipo "Cartão de Crédito" do grupo de contas (RN015)', () => {
    const accountGroup = makeAccountGroup({ type: 'CREDIT_CARD' })

    expect(AccountGroupPresenter.toHTTP(accountGroup, 0).type).toBe('CREDIT_CARD')
  })

  it('deve expor a quantidade de contas vinculadas ao grupo de contas', () => {
    const accountGroup = makeAccountGroup()

    expect(AccountGroupPresenter.toHTTP(accountGroup, 5).accountsCount).toBe(5)
  })

  it('deve expor a data de atualização quando o grupo de contas já foi alterado', () => {
    const updatedAt = new Date('2026-02-20T12:00:00.000Z')
    const accountGroup = makeAccountGroup({ updatedAt })

    expect(AccountGroupPresenter.toHTTP(accountGroup, 0).updatedAt).toEqual(updatedAt)
  })
})
