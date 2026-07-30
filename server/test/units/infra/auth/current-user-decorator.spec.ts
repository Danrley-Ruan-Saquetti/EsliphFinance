import { ExecutionContext } from '@nestjs/common'
import { describe, expect, it } from 'vitest'

import { AuthenticatedRequest } from '@infra/auth/authenticated-request'
import { authenticatedUserOf } from '@infra/auth/current-user-decorator'
import { UnauthenticatedError } from '@infra/auth/errors/unauthenticated-error'

const USER_ID = '0b6f0f4a-6d2c-4a5d-9e1f-3a6c1d7b2e84'

function makeExecutionContext(request: Partial<AuthenticatedRequest>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext
}

describe('authenticatedUserOf', () => {
  it('deve devolver o usuário que o guard anexou à requisição (RN011)', () => {
    const context = makeExecutionContext({ user: { id: USER_ID } })

    expect(authenticatedUserOf(undefined, context)).toEqual({ id: USER_ID })
  })

  it('deve lançar UnauthenticatedError quando a requisição não tem usuário autenticado (RNF005)', () => {
    const context = makeExecutionContext({})

    expect(() => authenticatedUserOf(undefined, context)).toThrow(UnauthenticatedError)
  })
})
