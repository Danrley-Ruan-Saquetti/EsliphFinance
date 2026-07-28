import { Injectable, NestMiddleware } from '@nestjs/common'
import { NextFunction, Request, Response } from 'express'

import { EnvService } from '@infra/env/env.service'
import { InsecureTransportError } from '@infra/http/errors/insecure-transport-error'

const FORWARDED_PROTOCOL_HEADER = 'x-forwarded-proto'
const FORWARDED_PROTOCOL_SEPARATOR = ','
const SECURE_PROTOCOL = 'https'
const PERMANENT_REDIRECT = 308

@Injectable()
export class HttpsRedirectMiddleware implements NestMiddleware {
  constructor(private readonly envService: EnvService) {}

  use(request: Request, response: Response, next: NextFunction): void {
    if (!this.envService.get('ENFORCE_HTTPS') || this.isSecure(request)) {
      return next()
    }

    const host = request.headers.host

    if (!host) {
      throw new InsecureTransportError()
    }

    response.redirect(PERMANENT_REDIRECT, `${SECURE_PROTOCOL}://${host}${request.originalUrl}`)
  }

  private isSecure(request: Request): boolean {
    const forwardedProtocol = request.headers[FORWARDED_PROTOCOL_HEADER]

    if (typeof forwardedProtocol !== 'string') {
      return Boolean(request.secure)
    }

    return forwardedProtocol.split(FORWARDED_PROTOCOL_SEPARATOR)[0].trim().toLowerCase() === SECURE_PROTOCOL
  }
}
