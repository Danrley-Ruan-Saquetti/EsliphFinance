import { JwtService } from '@nestjs/jwt'
import { beforeEach, describe, expect, it } from 'vitest'

import { JwtAccessTokenGenerator } from '@infra/cryptography/jwt-access-token-generator'
import { makeEnvService } from '@tests/factories/make-env-service'

const SECRET = 'esliph-finance-development-secret-key'
const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 900

let jwtService: JwtService
let sut: JwtAccessTokenGenerator

describe('JwtAccessTokenGenerator', () => {
  beforeEach(() => {
    jwtService = new JwtService({ secret: SECRET, signOptions: { algorithm: 'HS256' } })
    sut = new JwtAccessTokenGenerator(jwtService, makeEnvService({ ACCESS_TOKEN_EXPIRES_IN_SECONDS }))
  })

  it('deve assinar um token JWT com o identificador do usuário (RNF005)', async () => {
    const token = await sut.generate({ sub: 'a1b2c3' })

    const payload = jwtService.verify<{ sub: string }>(token, { secret: SECRET })

    expect(payload.sub).toBe('a1b2c3')
  })

  it('deve aplicar a expiração curta configurada por variável de ambiente (RN005)', async () => {
    const token = await sut.generate({ sub: 'a1b2c3' })

    const payload = jwtService.verify<{ exp: number; iat: number }>(token, { secret: SECRET })

    expect(payload.exp - payload.iat).toBe(ACCESS_TOKEN_EXPIRES_IN_SECONDS)
  })

  it('deve produzir um token que não é aceito por outro segredo (RNF005)', async () => {
    const token = await sut.generate({ sub: 'a1b2c3' })

    const verification = () => jwtService.verify(token, { secret: 'outro-segredo-de-assinatura-com-32-caracteres' })

    expect(verification).toThrow()
  })
})
