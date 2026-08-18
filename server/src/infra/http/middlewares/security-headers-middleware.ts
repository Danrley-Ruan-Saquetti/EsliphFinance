import { Injectable, NestMiddleware } from '@nestjs/common'
import { NextFunction, Request, Response } from 'express'
import helmet from 'helmet'

import { EnvService } from '@infra/env/env.service'

const NO_SOURCE = "'none'"

type StrictTransportSecurity = { maxAge: number; includeSubDomains: boolean; preload: boolean }

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  private readonly applySecurityHeaders: ReturnType<typeof helmet>

  constructor(envService: EnvService) {
    this.applySecurityHeaders = helmet({
      contentSecurityPolicy: { directives: { defaultSrc: [NO_SOURCE], frameAncestors: [NO_SOURCE] } },
      crossOriginResourcePolicy: { policy: 'same-origin' },
      referrerPolicy: { policy: 'no-referrer' },
      xFrameOptions: { action: 'deny' },
      hsts: this.buildStrictTransportSecurity(envService),
    })
  }

  use(request: Request, response: Response, next: NextFunction): void {
    this.applySecurityHeaders(request, response, next)
  }

  private buildStrictTransportSecurity(envService: EnvService): StrictTransportSecurity | false {
    if (!envService.get('ENFORCE_HTTPS')) {
      return false
    }

    return { maxAge: envService.get('HSTS_MAX_AGE'), includeSubDomains: true, preload: true }
  }
}
