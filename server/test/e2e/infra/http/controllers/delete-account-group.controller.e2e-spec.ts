import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { App } from 'supertest/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '@app.module'
import { cleanDatabase } from '@tests/database/clean-database'

describe('Excluir grupo de contas (e2e)', () => {
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

  it('DELETE /account-groups/:id exclui o grupo de contas sem contas vinculadas (RN017)', async () => {
    const created = await request(app.getHttpServer())
      .post('/account-groups')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Carteira', type: 'DEFAULT' })

    const accountGroupId = created.body.accountGroup.id as string

    const response = await request(app.getHttpServer()).delete(`/account-groups/${accountGroupId}`).set('Authorization', `Bearer ${accessToken}`)

    expect(response.statusCode).toBe(204)

    const getResponse = await request(app.getHttpServer()).get(`/account-groups/${accountGroupId}`).set('Authorization', `Bearer ${accessToken}`)

    expect(getResponse.statusCode).toBe(404)
  })

  it('DELETE /account-groups/:id devolve 400 quando o grupo possuir contas vinculadas (RN017)', async () => {
    const created = await request(app.getHttpServer())
      .post('/account-groups')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Carteira', type: 'DEFAULT' })

    const accountGroupId = created.body.accountGroup.id as string

    await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ accountGroupId, name: 'Nubank', icon: 'card', color: '#820AD1' })

    const response = await request(app.getHttpServer()).delete(`/account-groups/${accountGroupId}`).set('Authorization', `Bearer ${accessToken}`)

    expect(response.statusCode).toBe(400)
    expect(response.body.code).toBe('ACCOUNT_GROUP_HAS_LINKED_ACCOUNTS')
    expect(response.body.message).toBe('Este grupo possui 1 conta vinculada e não pode ser excluído')
  })

  it('DELETE /account-groups/:id devolve 404 quando o grupo de contas não existir', async () => {
    const response = await request(app.getHttpServer()).delete(`/account-groups/${randomUUID()}`).set('Authorization', `Bearer ${accessToken}`)

    expect(response.statusCode).toBe(404)
    expect(response.body.code).toBe('RESOURCE_NOT_FOUND')
  })

  it('DELETE /account-groups/:id devolve 404 quando o grupo de contas é de outro usuário (RN010, RN011)', async () => {
    const created = await request(app.getHttpServer())
      .post('/account-groups')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Investimentos', type: 'DEFAULT' })

    const accountGroupId = created.body.accountGroup.id as string

    const response = await request(app.getHttpServer()).delete(`/account-groups/${accountGroupId}`).set('Authorization', `Bearer ${anotherAccessToken}`)

    expect(response.statusCode).toBe(404)
    expect(response.body.code).toBe('RESOURCE_NOT_FOUND')
  })

  it('DELETE /account-groups/:id rejeita identificador inválido com 422', async () => {
    const response = await request(app.getHttpServer()).delete('/account-groups/identificador-invalido').set('Authorization', `Bearer ${accessToken}`)

    expect(response.statusCode).toBe(422)
    expect(response.body.code).toBe('VALIDATION_FAILED')
  })

  it('DELETE /account-groups/:id rejeita requisição sem token de acesso com 401', async () => {
    const response = await request(app.getHttpServer()).delete(`/account-groups/${randomUUID()}`)

    expect(response.statusCode).toBe(401)
    expect(response.body.code).toBe('UNAUTHENTICATED')
  })
})
