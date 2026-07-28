import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '@app.module'

describe('Headers de segurança (e2e)', () => {
  let app: INestApplication<App>

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('aplica os headers de segurança nas respostas de sucesso', async () => {
    const response = await request(app.getHttpServer()).get('/status')

    expect(response.headers['content-security-policy']).toContain('default-src \'none\'')
    expect(response.headers['x-content-type-options']).toBe('nosniff')
    expect(response.headers['x-frame-options']).toBe('DENY')
    expect(response.headers['referrer-policy']).toBe('no-referrer')
    expect(response.headers['cross-origin-resource-policy']).toBe('same-origin')
  })

  it('aplica os headers de segurança também nas respostas de erro', async () => {
    const response = await request(app.getHttpServer()).get('/rota-inexistente')

    expect(response.statusCode).toBe(404)
    expect(response.headers['x-content-type-options']).toBe('nosniff')
  })

  it('não anuncia a tecnologia do servidor', async () => {
    const response = await request(app.getHttpServer()).get('/status')

    expect(response.headers['x-powered-by']).toBeUndefined()
  })

  it('não anuncia o Strict-Transport-Security quando o HTTPS não é obrigatório', async () => {
    const response = await request(app.getHttpServer()).get('/status')

    expect(response.headers['strict-transport-security']).toBeUndefined()
  })
})
