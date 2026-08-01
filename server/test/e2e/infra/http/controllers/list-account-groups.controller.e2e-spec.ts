import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '@app.module'
import { accountGroups } from '@infra/database/drizzle/schemas/account-groups'
import { cleanDatabase } from '@tests/database/clean-database'

describe('Listar grupos de contas (e2e)', () => {
  let app: INestApplication<App>
  let accessToken: string
  let anotherAccessToken: string

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    await cleanDatabase(app)

    await request(app.getHttpServer()).post('/users').send({ name: 'Fulano de Tal', email: 'fulano@exemplo.com', password: 'senha-secreta' })
    await request(app.getHttpServer()).post('/users').send({ name: 'Beltrano de Tal', email: 'beltrano@exemplo.com', password: 'senha-secreta' })

    const session = await request(app.getHttpServer()).post('/sessions').send({ email: 'fulano@exemplo.com', password: 'senha-secreta' })
    const anotherSession = await request(app.getHttpServer()).post('/sessions').send({ email: 'beltrano@exemplo.com', password: 'senha-secreta' })

    accessToken = session.body.accessToken as string
    anotherAccessToken = anotherSession.body.accessToken as string

    await request(app.getHttpServer()).post('/account-groups').set('Authorization', `Bearer ${accessToken}`).send({ name: 'Contas' })
    await request(app.getHttpServer()).post('/account-groups').set('Authorization', `Bearer ${accessToken}`).send({ name: 'Cartões', type: 'CREDIT_CARD' })
    await request(app.getHttpServer()).post('/account-groups').set('Authorization', `Bearer ${anotherAccessToken}`).send({ name: 'Contas do Beltrano' })
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /account-groups lista os grupos de contas do usuário autenticado (RN010, RN011)', async () => {
    const response = await request(app.getHttpServer()).get('/account-groups').set('Authorization', `Bearer ${accessToken}`)

    expect(response.statusCode).toBe(200)
    expect(response.body.accountGroups).toHaveLength(2)
    expect(response.body.accountGroups[0]).toEqual(
      expect.objectContaining({ id: expect.any(String) as string, name: 'Cartões', type: 'CREDIT_CARD', accountsCount: 0 }),
    )
  })

  it('GET /account-groups filtra os grupos de contas pelo tipo informado (RN015)', async () => {
    const response = await request(app.getHttpServer()).get('/account-groups').query({ type: 'DEFAULT' }).set('Authorization', `Bearer ${accessToken}`)

    expect(response.statusCode).toBe(200)
    expect(response.body.accountGroups).toHaveLength(1)
    expect(response.body.accountGroups[0].name).toBe('Contas')
  })

  it('GET /account-groups rejeita tipo fora do domínio permitido com 422 (RN015)', async () => {
    const response = await request(app.getHttpServer()).get('/account-groups').query({ type: 'INVESTMENT' }).set('Authorization', `Bearer ${accessToken}`)

    expect(response.statusCode).toBe(422)
    expect(response.body.code).toBe('VALIDATION_FAILED')
    expect(response.body.details.map((detail: { field: string }) => detail.field)).toEqual(['type'])
  })

  it('GET /account-groups rejeita requisição sem token de acesso com 401', async () => {
    const response = await request(app.getHttpServer()).get('/account-groups')

    expect(response.statusCode).toBe(401)
    expect(response.body.code).toBe('UNAUTHENTICATED')
  })
})
