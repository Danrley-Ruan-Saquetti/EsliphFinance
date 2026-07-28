import { NextFunction, Request, Response } from 'express'
import { describe, expect, it } from 'vitest'

import { InsecureTransportError } from '@infra/http/errors/insecure-transport-error'
import { HttpsRedirectMiddleware } from '@infra/http/middlewares/https-redirect-middleware'
import { makeEnvService } from '@tests/factories/make-env-service'

type Redirection = { status: number; location: string }

function makeRequest(override: Partial<Request> = {}): Request {
  return { headers: { host: 'api.esliph.com' }, method: 'GET', originalUrl: '/status', secure: false, ...override } as unknown as Request
}

function makeResponse(): { response: Response; redirection: () => Redirection | undefined } {
  let redirection: Redirection | undefined

  const response = {
    redirect(status: number, location: string) {
      redirection = { status, location }
    },
  } as unknown as Response

  return { response, redirection: () => redirection }
}

function makeNext(): { next: NextFunction; wasCalled: () => boolean } {
  let called = false

  return { next: () => (called = true), wasCalled: () => called }
}

describe('HttpsRedirectMiddleware', () => {
  it('deve deixar a requisição seguir quando o HTTPS não é obrigatório', () => {
    const sut = new HttpsRedirectMiddleware(makeEnvService({ ENFORCE_HTTPS: false }))
    const { response, redirection } = makeResponse()
    const { next, wasCalled } = makeNext()

    sut.use(makeRequest({ headers: { host: 'api.esliph.com', 'x-forwarded-proto': 'http' } }), response, next)

    expect(wasCalled()).toBe(true)
    expect(redirection()).toBeUndefined()
  })

  it('deve redirecionar para HTTPS preservando o caminho quando a requisição chega em HTTP (RNF007)', () => {
    const sut = new HttpsRedirectMiddleware(makeEnvService({ ENFORCE_HTTPS: true }))
    const { response, redirection } = makeResponse()
    const { next, wasCalled } = makeNext()

    sut.use(makeRequest({ headers: { host: 'api.esliph.com', 'x-forwarded-proto': 'http' }, originalUrl: '/notes?ownerId=1' }), response, next)

    expect(redirection()).toEqual({ status: 308, location: 'https://api.esliph.com/notes?ownerId=1' })
    expect(wasCalled()).toBe(false)
  })

  it('deve deixar a requisição seguir quando o proxy informa que o protocolo é HTTPS', () => {
    const sut = new HttpsRedirectMiddleware(makeEnvService({ ENFORCE_HTTPS: true }))
    const { response, redirection } = makeResponse()
    const { next, wasCalled } = makeNext()

    sut.use(makeRequest({ headers: { host: 'api.esliph.com', 'x-forwarded-proto': 'HTTPS' } }), response, next)

    expect(wasCalled()).toBe(true)
    expect(redirection()).toBeUndefined()
  })

  it('deve considerar o primeiro protocolo da cadeia de proxies', () => {
    const sut = new HttpsRedirectMiddleware(makeEnvService({ ENFORCE_HTTPS: true }))
    const { response } = makeResponse()
    const { next, wasCalled } = makeNext()

    sut.use(makeRequest({ headers: { host: 'api.esliph.com', 'x-forwarded-proto': 'https, http' } }), response, next)

    expect(wasCalled()).toBe(true)
  })

  it('deve deixar a requisição seguir quando o TLS termina na própria aplicação', () => {
    const sut = new HttpsRedirectMiddleware(makeEnvService({ ENFORCE_HTTPS: true }))
    const { response, redirection } = makeResponse()
    const { next, wasCalled } = makeNext()

    sut.use(makeRequest({ secure: true }), response, next)

    expect(wasCalled()).toBe(true)
    expect(redirection()).toBeUndefined()
  })

  it('deve recusar a requisição insegura quando não há host para onde redirecionar (RNF007)', () => {
    const sut = new HttpsRedirectMiddleware(makeEnvService({ ENFORCE_HTTPS: true }))
    const { response } = makeResponse()
    const { next } = makeNext()

    expect(() => sut.use(makeRequest({ headers: {} }), response, next)).toThrow(InsecureTransportError)
  })
})
