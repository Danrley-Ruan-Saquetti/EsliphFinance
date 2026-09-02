import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '@app.module'
import { EnvService } from '@infra/env/env.service'
import { makeEnvService } from '@tests/factories/make-env-service'

describe('Segurança de transporte (e2e)', () => {
  let app: INestApplication<App>

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EnvService)
      .useValue(makeEnvService({ ENFORCE_HTTPS: true, HSTS_MAX_AGE: 31536000 }))
      .compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('redireciona a requisição que chega em HTTP preservando método e caminho (RNF-0007)', async () => {
    const response = await request(app.getHttpServer()).get('/status').set('x-forwarded-proto', 'http')

    expect(response.statusCode).toBe(308)
    expect(response.headers.location).toMatch(/^https:\/\/.+\/status$/)
  })

  it('atende normalmente a requisição encaminhada como HTTPS pelo proxy (RNF-0007)', async () => {
    const response = await request(app.getHttpServer()).get('/status').set('x-forwarded-proto', 'https')

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({ status: true })
  })

  it('anuncia o Strict-Transport-Security quando o HTTPS é obrigatório (RNF-0007)', async () => {
    const response = await request(app.getHttpServer()).get('/status').set('x-forwarded-proto', 'https')

    expect(response.headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains; preload')
  })
})
