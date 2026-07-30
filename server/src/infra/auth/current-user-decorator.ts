import { createParamDecorator, ExecutionContext } from '@nestjs/common'

import { AuthenticatedRequest } from '@infra/auth/authenticated-request'
import { AuthenticatedUser } from '@infra/auth/authenticated-user'
import { UnauthenticatedError } from '@infra/auth/errors/unauthenticated-error'

export function authenticatedUserOf(_data: unknown, context: ExecutionContext): AuthenticatedUser {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>()

  if (!request.user) {
    throw new UnauthenticatedError()
  }

  return request.user
}

export const CurrentUser = createParamDecorator(authenticatedUserOf)
