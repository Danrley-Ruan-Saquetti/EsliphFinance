import { describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { InvariantError } from '@core/errors/invariant-error'
import { AccountGroup } from '@domain/account-group/enterprise/entities/account-group'
import { AccountGroupType } from '@domain/account-group/enterprise/value-objects/account-group-type'

describe('AccountGroup', () => {
  it('deve criar o grupo de contas com o nome e o tipo informados (RN015, RN016)', () => {
    const ownerId = new UniqueEntityID()

    const accountGroup = AccountGroup.create({ ownerId, name: 'Cartões', type: 'CREDIT_CARD' })

    expect(accountGroup.ownerId).toBe(ownerId)
    expect(accountGroup.name).toBe('Cartões')
    expect(accountGroup.type).toBe('CREDIT_CARD')
    expect(accountGroup.createdAt).toBeInstanceOf(Date)
    expect(accountGroup.updatedAt).toBeUndefined()
  })

  it('deve assumir o tipo "Padrão" quando o tipo não for informado (RN016)', () => {
    const accountGroup = AccountGroup.create({ ownerId: new UniqueEntityID(), name: 'Contas' })

    expect(accountGroup.type).toBe('DEFAULT')
  })

  it('deve remover os espaços das extremidades do nome', () => {
    const accountGroup = AccountGroup.create({ ownerId: new UniqueEntityID(), name: '  Contas  ' })

    expect(accountGroup.name).toBe('Contas')
  })

  it('deve lançar InvariantError quando o nome for vazio (RN016)', () => {
    expect(() => AccountGroup.create({ ownerId: new UniqueEntityID(), name: '   ' })).toThrow(InvariantError)
  })

  it('deve aceitar o nome com o tamanho máximo permitido', () => {
    const name = 'a'.repeat(AccountGroup.NAME_MAX_LENGTH)

    const accountGroup = AccountGroup.create({ ownerId: new UniqueEntityID(), name })

    expect(accountGroup.name).toBe(name)
  })

  it('deve lançar InvariantError quando o nome exceder o tamanho máximo', () => {
    const name = 'a'.repeat(AccountGroup.NAME_MAX_LENGTH + 1)

    expect(() => AccountGroup.create({ ownerId: new UniqueEntityID(), name })).toThrow(InvariantError)
  })

  it('deve lançar InvariantError quando o tipo estiver fora do domínio permitido (RN015)', () => {
    expect(() => AccountGroup.create({ ownerId: new UniqueEntityID(), name: 'Contas', type: 'INVESTMENT' as AccountGroupType })).toThrow(InvariantError)
  })
})
