import { NextFunction, Request, Response } from 'express'
import { describe, expect, it } from 'vitest'

import { SecurityHeadersMiddleware } from '@infra/http/middlewares/security-headers-middleware'
import { makeEnvService } from '@tests/factories/make-env-service'

function makeRequest(): Request {
  return { headers: {}, method: 'GET' } as unknown as Request
}

function makeResponse(): { response: Response; headers: Record<string, string> } {
  const headers: Record<string, string> = {}

  const response = {
    setHeader(name: string, value: string) {
      headers[name] = value
    },
    getHeader(name: string) {
      return headers[name]
    },
    removeHeader(name: string) {
      delete headers[name]
    },
  } as unknown as Response

  return { response, headers }
}

function applyMiddleware(sut: SecurityHeadersMiddleware): { headers: Record<string, string>; wasCalled: boolean } {
  const { response, headers } = makeResponse()
  let wasCalled = false
  const next: NextFunction = () => (wasCalled = true)

  sut.use(makeRequest(), response, next)

  return { headers, wasCalled }
}

describe('SecurityHeadersMiddleware', () => {
  it('deve aplicar os headers de segurança e seguir para o próximo middleware', () => {
    const sut = new SecurityHeadersMiddleware(makeEnvService())

    const { headers, wasCalled } = applyMiddleware(sut)

    expect(headers['Content-Security-Policy']).toContain('default-src \'none\'')
    expect(headers['Content-Security-Policy']).toContain('frame-ancestors \'none\'')
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(headers['X-Frame-Options']).toBe('DENY')
    expect(headers['Referrer-Policy']).toBe('no-referrer')
    expect(headers['Cross-Origin-Resource-Policy']).toBe('same-origin')
    expect(wasCalled).toBe(true)
  })

  it('deve remover o header que revela a tecnologia do servidor', () => {
    const sut = new SecurityHeadersMiddleware(makeEnvService())

    const { headers } = applyMiddleware(sut)

    expect(headers['X-Powered-By']).toBeUndefined()
  })

  it('deve anunciar o Strict-Transport-Security quando o HTTPS é obrigatório (RNF007)', () => {
    const sut = new SecurityHeadersMiddleware(makeEnvService({ ENFORCE_HTTPS: true, HSTS_MAX_AGE: 600 }))

    const { headers } = applyMiddleware(sut)

    expect(headers['Strict-Transport-Security']).toBe('max-age=600; includeSubDomains; preload')
  })

  it('deve omitir o Strict-Transport-Security quando o HTTPS não é obrigatório', () => {
    const sut = new SecurityHeadersMiddleware(makeEnvService({ ENFORCE_HTTPS: false }))

    const { headers } = applyMiddleware(sut)

    expect(headers['Strict-Transport-Security']).toBeUndefined()
  })
})
