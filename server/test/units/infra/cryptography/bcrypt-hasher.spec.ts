import { compare } from 'bcryptjs'
import { beforeEach, describe, expect, it } from 'vitest'

import { BcryptHasher } from '@infra/cryptography/bcrypt-hasher'

let sut: BcryptHasher

describe('BcryptHasher', () => {
  beforeEach(() => {
    sut = new BcryptHasher()
  })

  it('deve gerar um hash diferente da senha em texto puro (RNF006)', async () => {
    const hash = await sut.hash('senha-secreta')

    expect(hash).not.toBe('senha-secreta')
    expect(hash).not.toContain('senha-secreta')
  })

  it('deve gerar um hash verificável pela senha que o originou (RNF006)', async () => {
    const hash = await sut.hash('senha-secreta')

    expect(await compare('senha-secreta', hash)).toBe(true)
    expect(await compare('outra-senha', hash)).toBe(false)
  })

  it('deve gerar hashes distintos para a mesma senha, por usar salt (RNF006)', async () => {
    const hash = await sut.hash('senha-secreta')
    const anotherHash = await sut.hash('senha-secreta')

    expect(hash).not.toBe(anotherHash)
  })

  it('deve confirmar a senha comparada contra o hash armazenado (RN004)', async () => {
    const hash = await sut.hash('senha-secreta')

    expect(await sut.compare('senha-secreta', hash)).toBe(true)
  })

  it('deve recusar a senha que não originou o hash armazenado (RN004)', async () => {
    const hash = await sut.hash('senha-secreta')

    expect(await sut.compare('outra-senha', hash)).toBe(false)
  })
})
