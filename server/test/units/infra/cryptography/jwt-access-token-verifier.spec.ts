import { JwtService } from '@nestjs/jwt'
import { beforeEach, describe, expect, it } from 'vitest'

import { JwtAccessTokenVerifier } from '@infra/cryptography/jwt-access-token-verifier'

const SECRET = 'esliph-finance-development-secret-key'
const OTHER_SECRET = 'outro-segredo-de-assinatura-com-32-caracteres'
const USER_ID = '0b6f0f4a-6d2c-4a5d-9e1f-3a6c1d7b2e84'

let jwtService: JwtService
let sut: JwtAccessTokenVerifier

describe('JwtAccessTokenVerifier', () => {
  beforeEach(() => {
    jwtService = new JwtService({ secret: SECRET, signOptions: { algorithm: 'HS256' } })
    sut = new JwtAccessTokenVerifier(jwtService)
  })

  it('deve devolver o identificador do usuário do token assinado com o segredo da aplicação (RNF005)', async () => {
    const token = jwtService.sign({ sub: USER_ID })

    await expect(sut.verify(token)).resolves.toEqual({ sub: USER_ID })
  })

  it('deve devolver null quando o token foi assinado com outro segredo (RNF005)', async () => {
    const token = jwtService.sign({ sub: USER_ID }, { secret: OTHER_SECRET })

    await expect(sut.verify(token)).resolves.toBeNull()
  })

  it('deve devolver null quando o token de acesso está expirado (RN005)', async () => {
    const token = jwtService.sign({ sub: USER_ID }, { expiresIn: -1 })

    await expect(sut.verify(token)).resolves.toBeNull()
  })

  it('deve devolver null quando o token não carrega um identificador de usuário válido', async () => {
    const token = jwtService.sign({ sub: 'não-é-um-identificador' })

    await expect(sut.verify(token)).resolves.toBeNull()
  })

  it('deve devolver null quando o token é malformado', async () => {
    await expect(sut.verify('token-inválido')).resolves.toBeNull()
  })
})
