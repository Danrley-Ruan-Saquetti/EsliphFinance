import { ArgumentsHost, BadRequestException, HttpException, HttpStatus, Logger, NotFoundException } from '@nestjs/common'
import { afterEach, beforeEach, describe, expect, it, MockInstance, vi } from 'vitest'

import { BaseError } from '@core/errors/base-error'
import { InvariantError } from '@core/errors/invariant-error'
import { NotAllowedError } from '@core/errors/not-allowed-error'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
import { ErrorResponse } from '@infra/http/errors/error-response'
import { ValidationError } from '@infra/http/errors/validation-error'
import { AllExceptionsFilter } from '@infra/http/filters/all-exceptions-filter'
import { RequestIdMiddleware } from '@infra/http/middlewares/request-id-middleware'

class PaymentRefusedError extends BaseError {
  readonly code = 'PAYMENT_REFUSED'

  constructor() {
    super('Pagamento recusado pela operadora')
  }
}

let sut: AllExceptionsFilter
let loggerError: MockInstance

function catchException(exception: unknown, headers: Record<string, string> = {}): { statusCode: number; body: ErrorResponse } {
  let statusCode = 0
  let body = {} as ErrorResponse

  const response = {
    status(status: number) {
      statusCode = status

      return this
    },
    json(payload: ErrorResponse) {
      body = payload
    },
  }
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ method: 'GET', url: '/notes/1', headers }),
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost

  sut.catch(exception, host)

  return { statusCode, body }
}

describe('AllExceptionsFilter', () => {
  beforeEach(() => {
    sut = new AllExceptionsFilter()
    loggerError = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('deve responder 422 com a lista de campos e mensagens para erro de validação', () => {
    const details = [
      { field: 'title', message: 'O título é obrigatório' },
      { field: 'amountInCents', message: 'Tipo inválido: esperado número' },
    ]

    const { statusCode, body } = catchException(new ValidationError(details))

    expect(statusCode).toBe(HttpStatus.UNPROCESSABLE_ENTITY)
    expect(body.statusCode).toBe(HttpStatus.UNPROCESSABLE_ENTITY)
    expect(body.code).toBe('VALIDATION_FAILED')
    expect(body.message).toBe('Falha na validação')
    expect(body.details).toEqual(details)
  })

  it('deve responder 404 com o código do erro quando o recurso não existe', () => {
    const { statusCode, body } = catchException(new ResourceNotFoundError('Nota não encontrada'))

    expect(statusCode).toBe(HttpStatus.NOT_FOUND)
    expect(body.code).toBe('RESOURCE_NOT_FOUND')
    expect(body.message).toBe('Nota não encontrada')
    expect(body.details).toBeUndefined()
  })

  it('deve responder 403 quando o registro é de outro usuário (RN-0010, RN-0011)', () => {
    const { statusCode, body } = catchException(new NotAllowedError())

    expect(statusCode).toBe(HttpStatus.FORBIDDEN)
    expect(body.code).toBe('NOT_ALLOWED')
  })

  it('deve responder 422 quando uma invariante de domínio é violada', () => {
    const { statusCode, body } = catchException(new InvariantError('O título da nota não pode ser vazio'))

    expect(statusCode).toBe(HttpStatus.UNPROCESSABLE_ENTITY)
    expect(body.code).toBe('INVARIANT_VIOLATION')
  })

  it('deve responder 400 para erro de regra de negócio sem status mapeado, preservando o código', () => {
    const { statusCode, body } = catchException(new PaymentRefusedError())

    expect(statusCode).toBe(HttpStatus.BAD_REQUEST)
    expect(body.code).toBe('PAYMENT_REFUSED')
    expect(body.message).toBe('Pagamento recusado pela operadora')
  })

  it('deve converter exceção do framework para o mesmo contrato de resposta', () => {
    const { statusCode, body } = catchException(new NotFoundException('Cannot GET /unknown'))

    expect(statusCode).toBe(HttpStatus.NOT_FOUND)
    expect(body.code).toBe('NOT_FOUND')
    expect(body.message).toBe('Cannot GET /unknown')
  })

  it('deve usar um código genérico para exceção do framework com status desconhecido', () => {
    const { body } = catchException(new HttpException('Session expired', 419))

    expect(body.statusCode).toBe(419)
    expect(body.code).toBe('HTTP_ERROR')
  })

  it('deve responder 500 sem vazar detalhes para erro inesperado', () => {
    const { statusCode, body } = catchException(new Error('Connection terminated unexpectedly'))

    expect(statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR)
    expect(body.code).toBe('INTERNAL_SERVER_ERROR')
    expect(body.message).toBe('Erro interno do servidor')
    expect(JSON.stringify(body)).not.toContain('Connection terminated unexpectedly')
  })

  it('deve responder 500 quando o que foi lançado não é um Error', () => {
    const { statusCode, body } = catchException('falha em uma biblioteca externa')

    expect(statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR)
    expect(body.message).toBe('Erro interno do servidor')
    expect(loggerError).toHaveBeenCalledWith(expect.any(String), 'falha em uma biblioteca externa')
  })

  it('deve responder 500 sem vazar a mensagem de exceção do framework de servidor', () => {
    const { body } = catchException(new HttpException('Database password is invalid', HttpStatus.SERVICE_UNAVAILABLE))

    expect(body.statusCode).toBe(HttpStatus.SERVICE_UNAVAILABLE)
    expect(body.message).toBe('Erro interno do servidor')
  })

  it('deve registrar o erro inesperado em log com o identificador da requisição', () => {
    const { body } = catchException(new Error('Connection terminated unexpectedly'), { [RequestIdMiddleware.HEADER]: 'correlation-1' })

    expect(body.requestId).toBe('correlation-1')
    expect(loggerError).toHaveBeenCalledWith(expect.stringContaining('correlation-1'), expect.stringContaining('Connection terminated unexpectedly'))
  })

  it('não deve registrar em log os erros esperados de negócio', () => {
    catchException(new BadRequestException('Invalid'))

    expect(loggerError).not.toHaveBeenCalled()
  })

  it('deve devolver a rota, o instante e o identificador da requisição em toda resposta de erro', () => {
    const { body } = catchException(new ResourceNotFoundError('Nota não encontrada'), { [RequestIdMiddleware.HEADER]: 'correlation-2' })

    expect(body.path).toBe('/notes/1')
    expect(body.requestId).toBe('correlation-2')
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp)
  })

  it('deve gerar um identificador de requisição quando a requisição não tem correlação', () => {
    const { body } = catchException(new ResourceNotFoundError('Nota não encontrada'))

    expect(body.requestId).toEqual(expect.any(String))
  })
})
