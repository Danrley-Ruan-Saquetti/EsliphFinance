import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { App } from 'supertest/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '@app.module'
import { DrizzleService } from '@infra/database/drizzle/drizzle.service'
import { accountGroups } from '@infra/database/drizzle/schemas/account-groups'
import { accounts } from '@infra/database/drizzle/schemas/accounts'
import { refreshTokens } from '@infra/database/drizzle/schemas/refresh-tokens'
import { users } from '@infra/database/drizzle/schemas/users'

describe('Consultar grupo de contas (e2e)', () => {
  let app: INestApplication<App>
  let drizzle: DrizzleService
  let accessToken: string
  let anotherAccessToken: string
  let accountGroupId: string

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    drizzle = app.get(DrizzleService)

    await drizzle.db.delete(accounts)
    await drizzle.db.delete(accountGroups)
    await drizzle.db.delete(refreshTokens)
    await drizzle.db.delete(users)

    await request(app.getHttpServer()).post('/users').send({ name: 'Fulano de Tal', email: 'fulano@exemplo.com', password: 'senha-secreta' })
    await request(app.getHttpServer()).post('/users').send({ name: 'Beltrano de Tal', email: 'beltrano@exemplo.com', password: 'senha-secreta' })

    const session = await request(app.getHttpServer()).post('/sessions').send({ email: 'fulano@exemplo.com', password: 'senha-secreta' })
    const anotherSession = await request(app.getHttpServer()).post('/sessions').send({ email: 'beltrano@exemplo.com', password: 'senha-secreta' })

    accessToken = session.body.accessToken as string
    anotherAccessToken = anotherSession.body.accessToken as string

    const created = await request(app.getHttpServer())
      .post('/account-groups')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Cartões', type: 'CREDIT_CARD' })

    accountGroupId = created.body.accountGroup.id as string
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /account-groups/:id devolve o grupo de contas do usuário autenticado', async () => {
    const response = await request(app.getHttpServer()).get(`/account-groups/${accountGroupId}`).set('Authorization', `Bearer ${accessToken}`)

    expect(response.statusCode).toBe(200)
    expect(response.body.accountGroup).toEqual(expect.objectContaining({ id: accountGroupId, name: 'Cartões', type: 'CREDIT_CARD', accountsCount: 0 }))
  })

  it('GET /account-groups/:id devolve 404 quando o grupo de contas não existe', async () => {
    const response = await request(app.getHttpServer()).get(`/account-groups/${randomUUID()}`).set('Authorization', `Bearer ${accessToken}`)

    expect(response.statusCode).toBe(404)
    expect(response.body.code).toBe('RESOURCE_NOT_FOUND')
  })

  it('GET /account-groups/:id devolve 404 quando o grupo de contas é de outro usuário (RN010, RN011)', async () => {
    const response = await request(app.getHttpServer()).get(`/account-groups/${accountGroupId}`).set('Authorization', `Bearer ${anotherAccessToken}`)

    expect(response.statusCode).toBe(404)
    expect(response.body.code).toBe('RESOURCE_NOT_FOUND')
  })

  it('GET /account-groups/:id rejeita identificador inválido com 422', async () => {
    const response = await request(app.getHttpServer()).get('/account-groups/identificador-invalido').set('Authorization', `Bearer ${accessToken}`)

    expect(response.statusCode).toBe(422)
    expect(response.body.code).toBe('VALIDATION_FAILED')
  })

  it('GET /account-groups/:id rejeita requisição sem token de acesso com 401', async () => {
    const response = await request(app.getHttpServer()).get(`/account-groups/${accountGroupId}`)

    expect(response.statusCode).toBe(401)
    expect(response.body.code).toBe('UNAUTHENTICATED')
  })
})
