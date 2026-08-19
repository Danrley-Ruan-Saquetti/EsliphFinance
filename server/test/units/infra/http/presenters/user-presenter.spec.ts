import { describe, expect, it } from 'vitest'

import { Email } from '@domain/user/enterprise/value-objects/email'
import { UserPresenter } from '@infra/http/presenters/user-presenter'
import { makeUser } from '@tests/factories/make-user'

describe('UserPresenter', () => {
  it('deve expor o usuário sem o hash da senha (RNF006)', () => {
    const user = makeUser({ email: Email.create('fulano@exemplo.com'), passwordHash: 'hash-da-senha' })

    const response = UserPresenter.toHTTP(user)

    expect(response).toEqual({
      id: user.id.toString(),
      name: user.name,
      email: 'fulano@exemplo.com',
      defaultTransactionStatus: null,
      createdAt: user.createdAt,
      updatedAt: null,
    })
    expect(JSON.stringify(response)).not.toContain('hash-da-senha')
  })

  it('deve expor a data de atualização quando o usuário já foi alterado', () => {
    const updatedAt = new Date(2026, 0, 2)
    const user = makeUser({ updatedAt })

    expect(UserPresenter.toHTTP(user).updatedAt).toBe(updatedAt)
  })

  it('deve expor a preferência de situação padrão de transação quando configurada (RN049)', () => {
    const user = makeUser({ defaultTransactionStatus: 'PLANNED' })

    expect(UserPresenter.toHTTP(user).defaultTransactionStatus).toBe('PLANNED')
  })
})
