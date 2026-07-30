import { ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { beforeEach, describe, expect, it } from 'vitest'

import { AuthenticatedRequest } from '@infra/auth/authenticated-request'
import { UnauthenticatedError } from '@infra/auth/errors/unauthenticated-error'
import { JwtAuthGuard } from '@infra/auth/jwt-auth-guard'
import { Public } from '@infra/auth/public-decorator'
import { FakeAccessTokenGenerator } from '@tests/cryptography/fake-access-token-generator'
import { FakeAccessTokenVerifier } from '@tests/cryptography/fake-access-token-verifier'

const USER_ID = '0b6f0f4a-6d2c-4a5d-9e1f-3a6c1d7b2e84'
const VALID_ACCESS_TOKEN = `${FakeAccessTokenGenerator.PREFIX}${USER_ID}`

class ProtectedController {
  handle(): void {}
}

@Public()
class PublicController {
  handle(): void {}
}

interface Controller {
  prototype: { handle: () => void }
}

let sut: JwtAuthGuard

function makeExecutionContext(controller: Controller, headers: Record<string, string> = {}): { context: ExecutionContext; request: AuthenticatedRequest } {
  const request = { headers } as unknown as AuthenticatedRequest
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => controller.prototype.handle,
    getClass: () => controller,
  } as unknown as ExecutionContext

  return { context, request }
}

describe('JwtAuthGuard', () => {
  beforeEach(() => {
    sut = new JwtAuthGuard(new FakeAccessTokenVerifier(), new Reflector())
  })

  it('deve liberar a rota marcada como pública sem exigir token', async () => {
    const { context, request } = makeExecutionContext(PublicController)

    await expect(sut.canActivate(context)).resolves.toBe(true)
    expect(request.user).toBeUndefined()
  })

  it('deve expor o usuário autenticado na requisição quando o token de acesso é válido (RNF005, RN011)', async () => {
    const { context, request } = makeExecutionContext(ProtectedController, { authorization: `Bearer ${VALID_ACCESS_TOKEN}` })

    await expect(sut.canActivate(context)).resolves.toBe(true)
    expect(request.user).toEqual({ id: USER_ID })
  })

  it('deve lançar UnauthenticatedError quando a requisição não envia o header de autorização (RNF005)', async () => {
    const { context } = makeExecutionContext(ProtectedController)

    await expect(sut.canActivate(context)).rejects.toBeInstanceOf(UnauthenticatedError)
  })

  it('deve lançar UnauthenticatedError quando o header de autorização não usa o esquema Bearer (RNF005)', async () => {
    const { context } = makeExecutionContext(ProtectedController, { authorization: `Basic ${VALID_ACCESS_TOKEN}` })

    await expect(sut.canActivate(context)).rejects.toBeInstanceOf(UnauthenticatedError)
  })

  it('deve lançar UnauthenticatedError quando o token de acesso é inválido (RNF005)', async () => {
    const { context, request } = makeExecutionContext(ProtectedController, { authorization: 'Bearer token-inválido' })

    await expect(sut.canActivate(context)).rejects.toBeInstanceOf(UnauthenticatedError)
    expect(request.user).toBeUndefined()
  })
})
