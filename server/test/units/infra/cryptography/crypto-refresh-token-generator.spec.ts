import { beforeEach, describe, expect, it } from 'vitest'

import { CryptoRefreshTokenGenerator } from '@infra/cryptography/crypto-refresh-token-generator'

const SHA256_HEXADECIMAL_LENGTH = 64

let sut: CryptoRefreshTokenGenerator

describe('CryptoRefreshTokenGenerator', () => {
  beforeEach(() => {
    sut = new CryptoRefreshTokenGenerator()
  })

  it('deve gerar um token diferente a cada chamada (RN007)', () => {
    const token = sut.generate()
    const anotherToken = sut.generate()

    expect(token).not.toBe(anotherToken)
  })

  it('deve gerar um token seguro para uso em URL', () => {
    const token = sut.generate()

    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('deve derivar o mesmo hash para o mesmo token, permitindo localizá-lo depois', () => {
    const token = sut.generate()

    expect(sut.hash(token)).toBe(sut.hash(token))
  })

  it('deve derivar hashes distintos para tokens distintos', () => {
    expect(sut.hash(sut.generate())).not.toBe(sut.hash(sut.generate()))
  })

  it('deve derivar um hash diferente do token, para nunca persistir o token entregue ao usuário', () => {
    const token = sut.generate()

    const tokenHash = sut.hash(token)

    expect(tokenHash).not.toBe(token)
    expect(tokenHash).toHaveLength(SHA256_HEXADECIMAL_LENGTH)
  })
})
