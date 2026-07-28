import { Injectable, NestMiddleware } from '@nestjs/common'
import cors, { CorsOptions } from 'cors'
import { NextFunction, Request, Response } from 'express'

import { ANY_ORIGIN } from '@infra/env/env'
import { EnvService } from '@infra/env/env.service'
import { RequestIdMiddleware } from '@infra/http/middlewares/request-id-middleware'

const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
const ALLOWED_HEADERS = ['Content-Type', 'Authorization', RequestIdMiddleware.HEADER]
const PREFLIGHT_MAX_AGE_IN_SECONDS = 86400

@Injectable()
export class CorsMiddleware implements NestMiddleware {
  private readonly applyCorsPolicy: ReturnType<typeof cors>

  constructor(envService: EnvService) {
    this.applyCorsPolicy = cors(this.buildCorsOptions(envService.get('CORS_ORIGINS')))
  }

  use(request: Request, response: Response, next: NextFunction): void {
    this.applyCorsPolicy(request, response, next)
  }

  private buildCorsOptions(origins: string[]): CorsOptions {
    return {
      origin: origins.includes(ANY_ORIGIN) ? ANY_ORIGIN : origins,
      methods: ALLOWED_METHODS,
      allowedHeaders: ALLOWED_HEADERS,
      exposedHeaders: [RequestIdMiddleware.HEADER],
      credentials: false,
      maxAge: PREFLIGHT_MAX_AGE_IN_SECONDS,
    }
  }
}
