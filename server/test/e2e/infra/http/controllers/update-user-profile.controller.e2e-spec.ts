import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '@app.module'
import { DrizzleService } from '@infra/database/drizzle/drizzle.service'
import { assetGroups } from '@infra/database/drizzle/schemas/asset-groups'
import { refreshTokens } from '@infra/database/drizzle/schemas/refresh-tokens'
import { users } from '@infra/database/drizzle/schemas/users'

describe('Atualizar perfil do usuário (e2e)', () => {
  let app: INestApplication<App>
  let accessToken: string

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    const drizzle = app.get(DrizzleService)

    await drizzle.db.delete(assetGroups)
    await drizzle.db.delete(refreshTokens)
    await drizzle.db.delete(users)

    await request(app.getHttpServer()).post('/users').send({ name: 'Fulano de Tal', email: 'fulano@exemplo.com', password: 'senha-secreta' })
    await request(app.getHttpServer()).post('/users').send({ name: 'Beltrano', email: 'beltrano@exemplo.com', password: 'senha-secreta' })

    const session = await request(app.getHttpServer()).post('/sessions').send({ email: 'fulano@exemplo.com', password: 'senha-secreta' })

    accessToken = session.body.accessToken as string
  })

  afterAll(async () => {
    await app.close()
  })

  it('PUT /users/me atualiza o nome e o e-mail do usuário autenticado', async () => {
    const response = await request(app.getHttpServer())
      .put('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Fulano Atualizado', email: 'atualizado@exemplo.com' })

    expect(response.statusCode).toBe(200)
    expect(response.body.user).toEqual(
      expect.objectContaining({ name: 'Fulano Atualizado', email: 'atualizado@exemplo.com', updatedAt: expect.any(String) as string }),
    )
    expect(response.body.user.passwordHash).toBeUndefined()
  })

  it('PUT /users/me rejeita o e-mail já utilizado por outro usuário com 409', async () => {
    const response = await request(app.getHttpServer())
      .put('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Fulano Atualizado', email: 'beltrano@exemplo.com' })

    expect(response.statusCode).toBe(409)
    expect(response.body.code).toBe('EMAIL_ALREADY_IN_USE')
  })

  it('PUT /users/me rejeita corpo inválido com 422', async () => {
    const response = await request(app.getHttpServer()).put('/users/me').set('Authorization', `Bearer ${accessToken}`).send({ name: '', email: 'não-é-email' })

    expect(response.statusCode).toBe(422)
    expect(response.body.code).toBe('VALIDATION_FAILED')
    expect(response.body.details.map((detail: { field: string }) => detail.field)).toEqual(['name', 'email'])
  })

  it('PUT /users/me rejeita requisição sem token de acesso com 401', async () => {
    const response = await request(app.getHttpServer()).put('/users/me').send({ name: 'Fulano Atualizado', email: 'atualizado@exemplo.com' })

    expect(response.statusCode).toBe(401)
    expect(response.body.code).toBe('UNAUTHENTICATED')
  })
})
