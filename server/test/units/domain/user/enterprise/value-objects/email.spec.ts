import { describe, expect, it } from 'vitest'

import { InvariantError } from '@core/errors/invariant-error'
import { Email } from '@domain/user/enterprise/value-objects/email'

describe('Email', () => {
  it('deve normalizar o e-mail para minúsculas e sem espaços nas pontas', () => {
    const email = Email.create('  Fulano@Exemplo.COM  ')

    expect(email.value).toBe('fulano@exemplo.com')
    expect(email.toString()).toBe('fulano@exemplo.com')
  })

  it('deve considerar iguais dois e-mails que só diferem em caixa e espaços', () => {
    expect(Email.create('Fulano@Exemplo.com').equals(Email.create(' fulano@exemplo.com '))).toBe(true)
  })

  it('deve lançar InvariantError quando o e-mail não tem arroba', () => {
    expect(() => Email.create('fulano.exemplo.com')).toThrow(InvariantError)
  })

  it('deve lançar InvariantError quando o e-mail não tem domínio com ponto', () => {
    expect(() => Email.create('fulano@exemplo')).toThrow(InvariantError)
  })

  it('deve lançar InvariantError quando o e-mail é vazio', () => {
    expect(() => Email.create('   ')).toThrow(InvariantError)
  })

  it('deve lançar InvariantError quando o e-mail tem espaço no meio', () => {
    expect(() => Email.create('ful ano@exemplo.com')).toThrow(InvariantError)
  })

  it('deve aceitar o e-mail com o tamanho máximo', () => {
    const domain = '@exemplo.com'
    const email = Email.create('a'.repeat(Email.MAX_LENGTH - domain.length) + domain)

    expect(email.value).toHaveLength(Email.MAX_LENGTH)
  })

  it('deve lançar InvariantError quando o e-mail ultrapassa o tamanho máximo', () => {
    const domain = '@exemplo.com'

    expect(() => Email.create('a'.repeat(Email.MAX_LENGTH - domain.length + 1) + domain)).toThrow(InvariantError)
  })
})
