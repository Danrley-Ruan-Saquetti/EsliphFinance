import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '@app.module'
import { DrizzleService } from '@infra/database/drizzle/drizzle.service'
import { refreshTokens } from '@infra/database/drizzle/schemas/refresh-tokens'
import { users } from '@infra/database/drizzle/schemas/users'

describe('Autenticar usuário (e2e)', () => {
  let app: INestApplication<App>

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

  it('POST /sessions devolve o token de acesso e o de renovação', async () => {
    const response = await request(app.getHttpServer()).post('/sessions').send({ email: 'fulano@exemplo.com', password: 'senha-secreta' })

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({ accessToken: expect.any(String) as string, refreshToken: expect.any(String) as string })
  })

  it('POST /sessions persiste o token de renovação sem armazenar o token entregue', async () => {
    const response = await request(app.getHttpServer()).post('/sessions').send({ email: 'fulano@exemplo.com', password: 'senha-secreta' })

    const storedTokens = await app.get(DrizzleService).db.select().from(refreshTokens)

    expect(storedTokens.length).toBeGreaterThan(0)
    expect(storedTokens.map(storedToken => storedToken.tokenHash)).not.toContain(response.body.refreshToken)
  })

  it('POST /sessions rejeita credenciais inválidas com 401', async () => {
    const response = await request(app.getHttpServer()).post('/sessions').send({ email: 'fulano@exemplo.com', password: 'senha-errada' })

    expect(response.statusCode).toBe(401)
    expect(response.body.code).toBe('INVALID_CREDENTIALS')
  })

  it('POST /sessions responde o mesmo erro para e-mail inexistente', async () => {
    const response = await request(app.getHttpServer()).post('/sessions').send({ email: 'ninguem@exemplo.com', password: 'senha-secreta' })

    expect(response.statusCode).toBe(401)
    expect(response.body.code).toBe('INVALID_CREDENTIALS')
  })

  it('POST /sessions rejeita corpo inválido com 422', async () => {
    const response = await request(app.getHttpServer()).post('/sessions').send({ email: 'não-é-email', password: '' })

    expect(response.statusCode).toBe(422)
    expect(response.body.code).toBe('VALIDATION_FAILED')
    expect(response.body.details.map((detail: { field: string }) => detail.field)).toEqual(['email', 'password'])
  })
})
