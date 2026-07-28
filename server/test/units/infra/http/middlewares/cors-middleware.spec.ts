import { NextFunction, Request, Response } from 'express'
import { describe, expect, it } from 'vitest'

import { CorsMiddleware } from '@infra/http/middlewares/cors-middleware'
import { makeEnvService } from '@tests/factories/make-env-service'

type MiddlewareResult = { headers: Record<string, string>; wasCalled: boolean; wasEnded: boolean }

function makeRequest(origin: string, method = 'GET'): Request {
  return { headers: { origin }, method } as unknown as Request
}

function makeResponse(): { response: Response; headers: Record<string, string>; wasEnded: () => boolean } {
  const headers: Record<string, string> = {}
  let ended = false

  const response = {
    setHeader(name: string, value: string) {
      headers[name] = value
    },
    getHeader(name: string) {
      return headers[name]
    },
    end() {
      ended = true
    },
  } as unknown as Response

  return { response, headers, wasEnded: () => ended }
}

function applyMiddleware(sut: CorsMiddleware, request: Request): MiddlewareResult {
  const { response, headers, wasEnded } = makeResponse()
  let wasCalled = false
  const next: NextFunction = () => (wasCalled = true)

  sut.use(request, response, next)

  return { headers, wasCalled, wasEnded: wasEnded() }
}

describe('CorsMiddleware', () => {
  const allowedOrigin = 'https://app.esliph.com'

  it('deve liberar qualquer origem quando a configuração usa o coringa', () => {
    const sut = new CorsMiddleware(makeEnvService())

    const { headers, wasCalled } = applyMiddleware(sut, makeRequest(allowedOrigin))

    expect(headers['Access-Control-Allow-Origin']).toBe('*')
    expect(wasCalled).toBe(true)
  })

  it('deve liberar a origem que consta na configuração', () => {
    const sut = new CorsMiddleware(makeEnvService({ CORS_ORIGINS: [allowedOrigin] }))

    const { headers } = applyMiddleware(sut, makeRequest(allowedOrigin))

    expect(headers['Access-Control-Allow-Origin']).toBe(allowedOrigin)
  })

  it('deve recusar a origem que não consta na configuração', () => {
    const sut = new CorsMiddleware(makeEnvService({ CORS_ORIGINS: [allowedOrigin] }))

    const { headers, wasCalled } = applyMiddleware(sut, makeRequest('https://origem-desconhecida.com'))

    expect(headers['Access-Control-Allow-Origin']).toBeUndefined()
    expect(wasCalled).toBe(true)
  })

  it('deve responder o preflight com os métodos e headers aceitos', () => {
    const sut = new CorsMiddleware(makeEnvService({ CORS_ORIGINS: [allowedOrigin] }))

    const { headers, wasEnded } = applyMiddleware(sut, makeRequest(allowedOrigin, 'OPTIONS'))

    expect(headers['Access-Control-Allow-Methods']).toBe('GET,POST,PUT,PATCH,DELETE,OPTIONS')
    expect(headers['Access-Control-Allow-Headers']).toBe('Content-Type,Authorization,x-request-id')
    expect(headers['Access-Control-Max-Age']).toBe('86400')
    expect(wasEnded).toBe(true)
  })

  it('deve expor o identificador de requisição ao cliente', () => {
    const sut = new CorsMiddleware(makeEnvService({ CORS_ORIGINS: [allowedOrigin] }))

    const { headers } = applyMiddleware(sut, makeRequest(allowedOrigin))

    expect(headers['Access-Control-Expose-Headers']).toBe('x-request-id')
  })
})
