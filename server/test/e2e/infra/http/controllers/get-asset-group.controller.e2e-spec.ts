import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { App } from 'supertest/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '@app.module'
import { DrizzleService } from '@infra/database/drizzle/drizzle.service'
import { assetGroups } from '@infra/database/drizzle/schemas/asset-groups'
import { refreshTokens } from '@infra/database/drizzle/schemas/refresh-tokens'
import { users } from '@infra/database/drizzle/schemas/users'

describe('Consultar grupo de ativo (e2e)', () => {
  let app: INestApplication<App>
  let drizzle: DrizzleService
  let accessToken: string
  let anotherAccessToken: string
  let assetGroupId: string

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    drizzle = app.get(DrizzleService)

    await drizzle.db.delete(assetGroups)
    await drizzle.db.delete(refreshTokens)
    await drizzle.db.delete(users)

    await request(app.getHttpServer()).post('/users').send({ name: 'Fulano de Tal', email: 'fulano@exemplo.com', password: 'senha-secreta' })
    await request(app.getHttpServer()).post('/users').send({ name: 'Beltrano de Tal', email: 'beltrano@exemplo.com', password: 'senha-secreta' })

    const session = await request(app.getHttpServer()).post('/sessions').send({ email: 'fulano@exemplo.com', password: 'senha-secreta' })
    const anotherSession = await request(app.getHttpServer()).post('/sessions').send({ email: 'beltrano@exemplo.com', password: 'senha-secreta' })

    accessToken = session.body.accessToken as string
    anotherAccessToken = anotherSession.body.accessToken as string

    const created = await request(app.getHttpServer())
      .post('/asset-groups')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Cartões', type: 'CREDIT_CARD' })

    assetGroupId = created.body.assetGroup.id as string
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /asset-groups/:id devolve o grupo de ativo do usuário autenticado', async () => {
    const response = await request(app.getHttpServer()).get(`/asset-groups/${assetGroupId}`).set('Authorization', `Bearer ${accessToken}`)

    expect(response.statusCode).toBe(200)
    expect(response.body.assetGroup).toEqual(expect.objectContaining({ id: assetGroupId, name: 'Cartões', type: 'CREDIT_CARD', assetsCount: 0 }))
  })

  it('GET /asset-groups/:id devolve 404 quando o grupo de ativo não existe', async () => {
    const response = await request(app.getHttpServer()).get(`/asset-groups/${randomUUID()}`).set('Authorization', `Bearer ${accessToken}`)

    expect(response.statusCode).toBe(404)
    expect(response.body.code).toBe('RESOURCE_NOT_FOUND')
  })

  it('GET /asset-groups/:id devolve 404 quando o grupo de ativo é de outro usuário (RN010, RN011)', async () => {
    const response = await request(app.getHttpServer()).get(`/asset-groups/${assetGroupId}`).set('Authorization', `Bearer ${anotherAccessToken}`)

    expect(response.statusCode).toBe(404)
    expect(response.body.code).toBe('RESOURCE_NOT_FOUND')
  })

  it('GET /asset-groups/:id rejeita identificador inválido com 422', async () => {
    const response = await request(app.getHttpServer()).get('/asset-groups/identificador-invalido').set('Authorization', `Bearer ${accessToken}`)

    expect(response.statusCode).toBe(422)
    expect(response.body.code).toBe('VALIDATION_FAILED')
  })

  it('GET /asset-groups/:id rejeita requisição sem token de acesso com 401', async () => {
    const response = await request(app.getHttpServer()).get(`/asset-groups/${assetGroupId}`)

    expect(response.statusCode).toBe(401)
    expect(response.body.code).toBe('UNAUTHENTICATED')
  })
})
