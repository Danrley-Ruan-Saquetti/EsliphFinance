import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { Request, Response } from 'express'
import { randomUUID } from 'node:crypto'

import { BaseError } from '@core/errors/base-error'
import { ErrorResponse } from '@infra/http/errors/error-response'
import { httpStatusByErrorCode } from '@infra/http/errors/http-status-by-error-code'
import { ValidationError } from '@infra/http/errors/validation-error'
import { RequestIdMiddleware } from '@infra/http/middlewares/request-id-middleware'

type ErrorDescription = Pick<ErrorResponse, 'statusCode' | 'code' | 'message' | 'details'>

const INTERNAL_ERROR_MESSAGE = 'Internal server error'
const SERVER_ERROR_MINIMUM_STATUS: number = HttpStatus.INTERNAL_SERVER_ERROR

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const httpContext = host.switchToHttp()
    const request = httpContext.getRequest<Request>()
    const response = httpContext.getResponse<Response>()
    const errorResponse = this.toErrorResponse(exception, request)

    this.logUnexpectedError(exception, request, errorResponse)

    response.status(errorResponse.statusCode).json(errorResponse)
  }

  private toErrorResponse(exception: unknown, request: Request): ErrorResponse {
    return {
      ...this.describe(exception),
      path: request.url,
      timestamp: new Date().toISOString(),
      requestId: this.resolveRequestId(request),
    }
  }

  private describe(exception: unknown): ErrorDescription {
    if (exception instanceof ValidationError) {
      return { statusCode: httpStatusByErrorCode(exception.code), code: exception.code, message: exception.message, details: exception.details }
    }

    if (exception instanceof BaseError) {
      return { statusCode: httpStatusByErrorCode(exception.code), code: exception.code, message: exception.message }
    }

    if (exception instanceof HttpException) {
      return this.describeHttpException(exception)
    }

    return this.describeInternalError()
  }

  private describeHttpException(exception: HttpException): ErrorDescription {
    const statusCode = exception.getStatus()
    const statusName: string | undefined = HttpStatus[statusCode]
    const code = statusName ?? 'HTTP_ERROR'

    if (this.isServerError(statusCode)) {
      return { statusCode, code, message: INTERNAL_ERROR_MESSAGE }
    }

    return { statusCode, code, message: exception.message }
  }

  private describeInternalError(): ErrorDescription {
    return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, code: 'INTERNAL_SERVER_ERROR', message: INTERNAL_ERROR_MESSAGE }
  }

  private isServerError(statusCode: number): boolean {
    return statusCode >= SERVER_ERROR_MINIMUM_STATUS
  }

  private resolveRequestId(request: Request): string {
    const requestId = request.headers[RequestIdMiddleware.HEADER]

    return typeof requestId === 'string' ? requestId : randomUUID()
  }

  private logUnexpectedError(exception: unknown, request: Request, errorResponse: ErrorResponse): void {
    if (!this.isServerError(errorResponse.statusCode)) {
      return
    }

    const summary = `${request.method} ${errorResponse.path} -> ${errorResponse.statusCode} [requestId=${errorResponse.requestId}]`

    this.logger.error(summary, exception instanceof Error ? exception.stack : String(exception))
  }
}
