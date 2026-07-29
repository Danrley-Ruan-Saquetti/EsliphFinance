import { describe, expect, it } from 'vitest'

import { InvariantError } from '@core/errors/invariant-error'
import { Password } from '@domain/user/enterprise/value-objects/password'

describe('Password', () => {
  it('deve lançar InvariantError quando a senha tem menos que o mínimo de caracteres (RN003)', () => {
    expect(() => Password.create('a'.repeat(Password.MIN_LENGTH - 1))).toThrow(InvariantError)
  })

  it('deve aceitar a senha com exatamente o mínimo de caracteres (RN003)', () => {
    const password = Password.create('a'.repeat(Password.MIN_LENGTH))

    expect(password.value).toHaveLength(Password.MIN_LENGTH)
  })

  it('deve aceitar a senha com mais que o mínimo de caracteres (RN003)', () => {
    const password = Password.create('a'.repeat(Password.MIN_LENGTH + 1))

    expect(password.value).toHaveLength(Password.MIN_LENGTH + 1)
  })

  it('deve lançar InvariantError quando a senha é vazia (RN003)', () => {
    expect(() => Password.create('')).toThrow(InvariantError)
  })

  it('deve preservar a senha exatamente como informada, sem normalizar', () => {
    const password = Password.create('  Senha Secreta  ')

    expect(password.value).toBe('  Senha Secreta  ')
  })
})
