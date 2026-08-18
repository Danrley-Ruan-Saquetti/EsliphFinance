import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { App } from 'supertest/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '@app.module'
import { cleanDatabase } from '@tests/database/clean-database'

describe('Desarquivar conta (e2e)', () => {
  let app: INestApplication<App>
  let accessToken: string
  let accountGroupId: string

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    await cleanDatabase(app)

    await request(app.getHttpServer()).post('/users').send({ name: 'Fulano de Tal', email: 'fulano@exemplo.com', password: 'senha-secreta' })

    const session = await request(app.getHttpServer()).post('/sessions').send({ email: 'fulano@exemplo.com', password: 'senha-secreta' })

    accessToken = session.body.accessToken as string

    const accountGroup = await request(app.getHttpServer())
      .post('/account-groups')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Contas', type: 'DEFAULT' })

    accountGroupId = accountGroup.body.accountGroup.id as string
  })

  afterAll(async () => {
    await app.close()
  })

  it('PATCH /accounts/:id/unarchive desarquiva a conta (RN024, RN025)', async () => {
    const created = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ accountGroupId, name: 'Conta antiga', color: '#1E88E5' })

    await request(app.getHttpServer())
      .patch(`/accounts/${created.body.account.id}/archive`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send()

    const response = await request(app.getHttpServer())
      .patch(`/accounts/${created.body.account.id}/unarchive`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send()

    expect(response.statusCode).toBe(200)
    expect(response.body.account.archivedAt).toBeNull()
  })

  it('PATCH /accounts/:id/unarchive rejeita conta inexistente com 404', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/accounts/${randomUUID()}/unarchive`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send()

    expect(response.statusCode).toBe(404)
    expect(response.body.code).toBe('RESOURCE_NOT_FOUND')
  })

  it('PATCH /accounts/:id/unarchive rejeita requisição sem token de acesso com 401', async () => {
    const response = await request(app.getHttpServer()).patch(`/accounts/${randomUUID()}/unarchive`).send()

    expect(response.statusCode).toBe(401)
    expect(response.body.code).toBe('UNAUTHENTICATED')
  })
})
