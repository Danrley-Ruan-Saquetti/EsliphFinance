import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '@app.module'
import { DrizzleService } from '@infra/database/drizzle/drizzle.service'
import { refreshTokens } from '@infra/database/drizzle/schemas/refresh-tokens'
import { users } from '@infra/database/drizzle/schemas/users'

describe('Renovar sessão (e2e)', () => {
  let app: INestApplication<App>

  async function authenticate() {
    const response = await request(app.getHttpServer()).post('/sessions').send({ email: 'fulano@exemplo.com', password: 'senha-secreta' })

    return response.body.refreshToken as string
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    const drizzle = app.get(DrizzleService)

    await drizzle.db.delete(refreshTokens)
    await drizzle.db.delete(users)

    await request(app.getHttpServer()).post('/users').send({ name: 'Fulano de Tal', email: 'fulano@exemplo.com', password: 'senha-secreta' })
  })

  afterAll(async () => {
    await app.close()
  })

  it('POST /sessions/refresh devolve um novo par de tokens', async () => {
    const refreshToken = await authenticate()

    const response = await request(app.getHttpServer()).post('/sessions/refresh').send({ refreshToken })

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({ accessToken: expect.any(String) as string, refreshToken: expect.any(String) as string })
    expect(response.body.refreshToken).not.toBe(refreshToken)
  })

  it('POST /sessions/refresh rejeita o token de renovação já utilizado com 401', async () => {
    const refreshToken = await authenticate()

    await request(app.getHttpServer()).post('/sessions/refresh').send({ refreshToken })

    const response = await request(app.getHttpServer()).post('/sessions/refresh').send({ refreshToken })

    expect(response.statusCode).toBe(401)
    expect(response.body.code).toBe('INVALID_REFRESH_TOKEN')
  })

  it('POST /sessions/refresh rejeita token de renovação inexistente com 401', async () => {
    const response = await request(app.getHttpServer()).post('/sessions/refresh').send({ refreshToken: 'token-inexistente' })

    expect(response.statusCode).toBe(401)
    expect(response.body.code).toBe('INVALID_REFRESH_TOKEN')
  })

  it('POST /sessions/refresh rejeita corpo inválido com 422', async () => {
    const response = await request(app.getHttpServer()).post('/sessions/refresh').send({ refreshToken: '' })

    expect(response.statusCode).toBe(422)
    expect(response.body.code).toBe('VALIDATION_FAILED')
    expect(response.body.details.map((detail: { field: string }) => detail.field)).toEqual(['refreshToken'])
  })
})
