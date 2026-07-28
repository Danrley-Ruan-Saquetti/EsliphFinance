import { Injectable, NestMiddleware } from '@nestjs/common'
import { NextFunction, Request, Response } from 'express'
import { randomUUID } from 'node:crypto'

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  static readonly HEADER = 'x-request-id'

  use(request: Request, response: Response, next: NextFunction): void {
    const requestId = this.resolveRequestId(request)

    request.headers[RequestIdMiddleware.HEADER] = requestId
    response.setHeader(RequestIdMiddleware.HEADER, requestId)

    next()
  }

  private resolveRequestId(request: Request): string {
    const incomingRequestId = request.headers[RequestIdMiddleware.HEADER]

    if (typeof incomingRequestId === 'string' && incomingRequestId.trim()) {
      return incomingRequestId.trim()
    }

    return randomUUID()
  }
}
