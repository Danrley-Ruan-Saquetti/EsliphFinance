import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '@app.module'
import { DrizzleService } from '@infra/database/drizzle/drizzle.service'
import { refreshTokens } from '@infra/database/drizzle/schemas/refresh-tokens'
import { users } from '@infra/database/drizzle/schemas/users'

describe('Consultar perfil do usuário (e2e)', () => {
  let app: INestApplication<App>
  let accessToken: string

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

    const session = await request(app.getHttpServer()).post('/sessions').send({ email: 'fulano@exemplo.com', password: 'senha-secreta' })

    accessToken = session.body.accessToken as string
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /users/me devolve os dados do usuário autenticado sem o hash da senha', async () => {
    const response = await request(app.getHttpServer()).get('/users/me').set('Authorization', `Bearer ${accessToken}`)

    expect(response.statusCode).toBe(200)
    expect(response.body.user).toEqual(expect.objectContaining({ id: expect.any(String) as string, name: 'Fulano de Tal', email: 'fulano@exemplo.com' }))
    expect(response.body.user.passwordHash).toBeUndefined()
  })

  it('GET /users/me rejeita requisição sem token de acesso com 401', async () => {
    const response = await request(app.getHttpServer()).get('/users/me')

    expect(response.statusCode).toBe(401)
    expect(response.body.code).toBe('UNAUTHENTICATED')
  })

  it('GET /users/me rejeita token de acesso inválido com 401', async () => {
    const response = await request(app.getHttpServer()).get('/users/me').set('Authorization', 'Bearer token-inválido')

    expect(response.statusCode).toBe(401)
    expect(response.body.code).toBe('UNAUTHENTICATED')
  })
})
