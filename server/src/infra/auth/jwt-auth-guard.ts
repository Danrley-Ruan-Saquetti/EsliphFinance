import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'

import { AccessTokenVerifier } from '@domain/user/application/services/access-token-verifier'
import { AuthenticatedRequest } from '@infra/auth/authenticated-request'
import { UnauthenticatedError } from '@infra/auth/errors/unauthenticated-error'
import { PUBLIC_ROUTE } from '@infra/auth/public-decorator'

const BEARER_PREFIX = 'Bearer '

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly accessTokenVerifier: AccessTokenVerifier,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.isPublic(context)) {
      return true
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const payload = await this.accessTokenVerifier.verify(this.extractAccessToken(request))

    if (!payload) {
      throw new UnauthenticatedError()
    }

    request.user = { id: payload.sub }

    return true
  }

  private isPublic(context: ExecutionContext): boolean {
    return this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [context.getHandler(), context.getClass()]) ?? false
  }

  private extractAccessToken(request: AuthenticatedRequest): string {
    const authorization = request.headers.authorization

    if (!authorization?.startsWith(BEARER_PREFIX)) {
      throw new UnauthenticatedError()
    }

    return authorization.slice(BEARER_PREFIX.length)
  }
}
