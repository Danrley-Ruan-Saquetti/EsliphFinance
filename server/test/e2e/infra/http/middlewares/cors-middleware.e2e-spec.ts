import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '@app.module'
import { EnvService } from '@infra/env/env.service'
import { makeEnvService } from '@tests/factories/make-env-service'

const allowedOrigin = 'https://app.esliph.com'

describe('Política de CORS (e2e)', () => {
  let app: INestApplication<App>

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EnvService)
      .useValue(makeEnvService({ CORS_ORIGINS: [allowedOrigin] }))
      .compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('libera a origem configurada', async () => {
    const response = await request(app.getHttpServer()).get('/status').set('Origin', allowedOrigin)

    expect(response.statusCode).toBe(200)
    expect(response.headers['access-control-allow-origin']).toBe(allowedOrigin)
  })

  it('não libera a origem que não está configurada', async () => {
    const response = await request(app.getHttpServer()).get('/status').set('Origin', 'https://origem-desconhecida.com')

    expect(response.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('responde o preflight com os métodos e headers aceitos', async () => {
    const response = await request(app.getHttpServer()).options('/notes').set('Origin', allowedOrigin).set('Access-Control-Request-Method', 'POST')

    expect(response.statusCode).toBe(204)
    expect(response.headers['access-control-allow-methods']).toBe('GET,POST,PUT,PATCH,DELETE,OPTIONS')
    expect(response.headers['access-control-allow-headers']).toBe('Content-Type,Authorization,x-request-id')
  })

  it('expõe o identificador de requisição ao cliente', async () => {
    const response = await request(app.getHttpServer()).get('/status').set('Origin', allowedOrigin)

    expect(response.headers['access-control-expose-headers']).toBe('x-request-id')
  })
})
