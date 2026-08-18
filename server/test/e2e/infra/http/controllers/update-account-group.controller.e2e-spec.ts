import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { App } from 'supertest/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '@app.module'
import { cleanDatabase } from '@tests/database/clean-database'

describe('Editar grupo de contas (e2e)', () => {
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
  })

  afterAll(async () => {
    await app.close()
  })

  it('PUT /account-groups/:id altera o nome e o tipo do grupo de contas sem contas vinculadas', async () => {
    const created = await request(app.getHttpServer())
      .post('/account-groups')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Contas', type: 'DEFAULT' })

    const accountGroupId = created.body.accountGroup.id as string

    const response = await request(app.getHttpServer())
      .put(`/account-groups/${accountGroupId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Contas Correntes', type: 'CREDIT_CARD' })

    expect(response.statusCode).toBe(200)
    expect(response.body.accountGroup).toEqual(
      expect.objectContaining({ id: accountGroupId, name: 'Contas Correntes', type: 'CREDIT_CARD', accountsCount: 0 }),
    )
  })

  it('PUT /account-groups/:id devolve 404 quando o grupo de contas não existe', async () => {
    const response = await request(app.getHttpServer())
      .put(`/account-groups/${randomUUID()}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Contas', type: 'DEFAULT' })

    expect(response.statusCode).toBe(404)
    expect(response.body.code).toBe('RESOURCE_NOT_FOUND')
  })

  it('PUT /account-groups/:id devolve 404 quando o grupo de contas é de outro usuário (RN010, RN011)', async () => {
    const created = await request(app.getHttpServer())
      .post('/account-groups')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Contas do Fulano', type: 'DEFAULT' })

    const accountGroupId = created.body.accountGroup.id as string

    const response = await request(app.getHttpServer())
      .put(`/account-groups/${accountGroupId}`)
      .set('Authorization', `Bearer ${anotherAccessToken}`)
      .send({ name: 'Invadido', type: 'DEFAULT' })

    expect(response.statusCode).toBe(404)
    expect(response.body.code).toBe('RESOURCE_NOT_FOUND')
  })

  it('PUT /account-groups/:id rejeita a alteração de tipo quando houver contas vinculadas (RN085)', async () => {
    const created = await request(app.getHttpServer())
      .post('/account-groups')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Contas com Vínculo', type: 'DEFAULT' })

    const accountGroupId = created.body.accountGroup.id as string

    await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Carteira', accountGroupId, initialBalance: 0, icon: 'wallet', color: '#FF0000' })

    const response = await request(app.getHttpServer())
      .put(`/account-groups/${accountGroupId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Contas com Vínculo', type: 'CREDIT_CARD' })

    expect(response.statusCode).toBe(403)
    expect(response.body.code).toBe('NOT_ALLOWED')
  })

  it('PUT /account-groups/:id rejeita corpo inválido com 422', async () => {
    const created = await request(app.getHttpServer())
      .post('/account-groups')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Contas', type: 'DEFAULT' })

    const accountGroupId = created.body.accountGroup.id as string

    const response = await request(app.getHttpServer())
      .put(`/account-groups/${accountGroupId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: '', type: 'DEFAULT' })

    expect(response.statusCode).toBe(422)
    expect(response.body.code).toBe('VALIDATION_FAILED')
  })

  it('PUT /account-groups/:id rejeita requisição sem token de acesso com 401', async () => {
    const response = await request(app.getHttpServer())
      .put(`/account-groups/${randomUUID()}`)
      .send({ name: 'Contas', type: 'DEFAULT' })

    expect(response.statusCode).toBe(401)
    expect(response.body.code).toBe('UNAUTHENTICATED')
  })
})
