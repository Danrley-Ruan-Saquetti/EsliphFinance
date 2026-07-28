import { NextFunction, Request, Response } from 'express'
import { beforeEach, describe, expect, it } from 'vitest'

import { RequestIdMiddleware } from '@infra/http/middlewares/request-id-middleware'

let sut: RequestIdMiddleware

function makeRequest(headers: Record<string, string> = {}): Request {
  return { headers } as unknown as Request
}

function makeResponse(): { response: Response; headers: Record<string, string> } {
  const headers: Record<string, string> = {}
  const response = {
    setHeader(name: string, value: string) {
      headers[name] = value
    },
  } as unknown as Response

  return { response, headers }
}

function makeNext(): { next: NextFunction; wasCalled: () => boolean } {
  let called = false

  return { next: () => (called = true), wasCalled: () => called }
}

describe('RequestIdMiddleware', () => {
  beforeEach(() => {
    sut = new RequestIdMiddleware()
  })

  it('deve gerar um identificador de requisição quando o cliente não envia nenhum', () => {
    const request = makeRequest()
    const { response, headers } = makeResponse()
    const { next, wasCalled } = makeNext()

    sut.use(request, response, next)

    expect(request.headers[RequestIdMiddleware.HEADER]).toEqual(expect.any(String))
    expect(headers[RequestIdMiddleware.HEADER]).toBe(request.headers[RequestIdMiddleware.HEADER])
    expect(wasCalled()).toBe(true)
  })

  it('deve preservar o identificador de requisição enviado pelo cliente', () => {
    const request = makeRequest({ [RequestIdMiddleware.HEADER]: '  correlation-1  ' })
    const { response, headers } = makeResponse()
    const { next } = makeNext()

    sut.use(request, response, next)

    expect(request.headers[RequestIdMiddleware.HEADER]).toBe('correlation-1')
    expect(headers[RequestIdMiddleware.HEADER]).toBe('correlation-1')
  })

  it('deve gerar um identificador de requisição quando o header enviado está em branco', () => {
    const request = makeRequest({ [RequestIdMiddleware.HEADER]: '   ' })
    const { response } = makeResponse()
    const { next } = makeNext()

    sut.use(request, response, next)

    expect(request.headers[RequestIdMiddleware.HEADER]).not.toBe('   ')
  })
})
