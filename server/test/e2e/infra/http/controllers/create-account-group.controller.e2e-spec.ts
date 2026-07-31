import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { App } from 'supertest/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '@app.module'
import { DrizzleService } from '@infra/database/drizzle/drizzle.service'
import { accountGroups } from '@infra/database/drizzle/schemas/account-groups'
import { refreshTokens } from '@infra/database/drizzle/schemas/refresh-tokens'
import { users } from '@infra/database/drizzle/schemas/users'

describe('Criar grupo de contas (e2e)', () => {
  let app: INestApplication<App>
  let drizzle: DrizzleService
  let accessToken: string

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    drizzle = app.get(DrizzleService)

    await drizzle.db.delete(accountGroups)
    await drizzle.db.delete(refreshTokens)
    await drizzle.db.delete(users)

    await request(app.getHttpServer()).post('/users').send({ name: 'Fulano de Tal', email: 'fulano@exemplo.com', password: 'senha-secreta' })

    const session = await request(app.getHttpServer()).post('/sessions').send({ email: 'fulano@exemplo.com', password: 'senha-secreta' })

    accessToken = session.body.accessToken as string
  })

  afterAll(async () => {
    await app.close()
  })

  it('POST /account-groups cria o grupo de contas', async () => {
    const response = await request(app.getHttpServer())
      .post('/account-groups')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Cartões', type: 'CREDIT_CARD' })

    expect(response.statusCode).toBe(201)
    expect(response.body.accountGroup).toEqual(expect.objectContaining({ id: expect.any(String) as string, name: 'Cartões', type: 'CREDIT_CARD' }))
  })

  it('POST /account-groups persiste o grupo de contas vinculado ao usuário autenticado (RN010)', async () => {
    const created = await request(app.getHttpServer())
      .post('/account-groups')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ownerId: randomUUID(), name: 'Contas' })

    const [record] = await drizzle.db
      .select()
      .from(accountGroups)
      .where(eq(accountGroups.id, created.body.accountGroup.id as string))

    const [user] = await drizzle.db.select().from(users).where(eq(users.email, 'fulano@exemplo.com'))

    expect(record.ownerId).toBe(user.id)
  })

  it('POST /account-groups rejeita corpo inválido com 422', async () => {
    const response = await request(app.getHttpServer()).post('/account-groups').set('Authorization', `Bearer ${accessToken}`).send({ name: '' })

    expect(response.statusCode).toBe(422)
    expect(response.body.code).toBe('VALIDATION_FAILED')
    expect(response.body.details.map((detail: { field: string }) => detail.field)).toEqual(['name'])
  })

  it('POST /account-groups rejeita tipo fora do domínio permitido com 422 (RN015)', async () => {
    const response = await request(app.getHttpServer())
      .post('/account-groups')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Investimentos', type: 'INVESTMENT' })

    expect(response.statusCode).toBe(422)
    expect(response.body.details.map((detail: { field: string }) => detail.field)).toEqual(['type'])
  })

  it('POST /account-groups rejeita requisição sem token de acesso com 401', async () => {
    const response = await request(app.getHttpServer()).post('/account-groups').send({ name: 'Contas' })

    expect(response.statusCode).toBe(401)
    expect(response.body.code).toBe('UNAUTHENTICATED')
  })
})
