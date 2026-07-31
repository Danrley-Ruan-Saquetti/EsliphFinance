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
import { accounts } from '@infra/database/drizzle/schemas/accounts'
import { refreshTokens } from '@infra/database/drizzle/schemas/refresh-tokens'
import { users } from '@infra/database/drizzle/schemas/users'

describe('Criar conta (e2e)', () => {
  let app: INestApplication<App>
  let drizzle: DrizzleService
  let accessToken: string
  let accountGroupId: string
  let creditCardAccountGroupId: string
  let otherUserAccountGroupId: string

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

    const session = await request(app.getHttpServer()).post('/sessions').send({ email: 'fulano@exemplo.com', password: 'senha-secreta' })

    accessToken = session.body.accessToken as string

    const accountGroup = await request(app.getHttpServer())
      .post('/account-groups')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Contas', type: 'DEFAULT' })

    accountGroupId = accountGroup.body.accountGroup.id as string

    const creditCardAccountGroup = await request(app.getHttpServer())
      .post('/account-groups')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Cartões', type: 'CREDIT_CARD' })

    creditCardAccountGroupId = creditCardAccountGroup.body.accountGroup.id as string

    await request(app.getHttpServer()).post('/users').send({ name: 'Ciclano de Tal', email: 'ciclano@exemplo.com', password: 'senha-secreta' })

    const otherSession = await request(app.getHttpServer()).post('/sessions').send({ email: 'ciclano@exemplo.com', password: 'senha-secreta' })

    const otherUserAccountGroup = await request(app.getHttpServer())
      .post('/account-groups')
      .set('Authorization', `Bearer ${otherSession.body.accessToken as string}`)
      .send({ name: 'Contas' })

    otherUserAccountGroupId = otherUserAccountGroup.body.accountGroup.id as string
  })

  afterAll(async () => {
    await app.close()
  })

  it('POST /accounts cria a conta', async () => {
    const response = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ accountGroupId, name: 'Carteira', initialBalance: 15000, icon: 'wallet', color: '#1E88E5' })

    expect(response.statusCode).toBe(201)
    expect(response.body.account).toEqual(
      expect.objectContaining({
        id: expect.any(String) as string,
        accountGroupId,
        name: 'Carteira',
        initialBalance: { amountInCents: 15000, formatted: '150.00' },
        icon: 'wallet',
        color: '#1E88E5',
      }),
    )
  })

  it('POST /accounts assume o saldo inicial zerado quando ele não for informado (RN018)', async () => {
    const response = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ accountGroupId, name: 'Poupança', color: '#43A047' })

    expect(response.statusCode).toBe(201)
    expect(response.body.account.initialBalance).toEqual({ amountInCents: 0, formatted: '0.00' })
  })

  it('POST /accounts aceita o saldo inicial negativo (RNF004)', async () => {
    const response = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ accountGroupId, name: 'Conta corrente', initialBalance: -25050, color: '#E53935' })

    expect(response.statusCode).toBe(201)
    expect(response.body.account.initialBalance).toEqual({ amountInCents: -25050, formatted: '-250.50' })
  })

  it('POST /accounts persiste a conta vinculada ao usuário autenticado (RN010)', async () => {
    const created = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ownerId: randomUUID(), accountGroupId, name: 'Reserva', color: '#8E24AA' })

    const [record] = await drizzle.db
      .select()
      .from(accounts)
      .where(eq(accounts.id, created.body.account.id as string))

    const [user] = await drizzle.db.select().from(users).where(eq(users.email, 'fulano@exemplo.com'))

    expect(record.ownerId).toBe(user.id)
  })

  it('POST /accounts passa a contar a conta no grupo de contas (RN017)', async () => {
    const persisted = await drizzle.db.select().from(accounts).where(eq(accounts.accountGroupId, accountGroupId))

    const response = await request(app.getHttpServer()).get(`/account-groups/${accountGroupId}`).set('Authorization', `Bearer ${accessToken}`)

    expect(persisted.length).toBeGreaterThan(0)
    expect(response.body.accountGroup.accountsCount).toBe(persisted.length)
  })

  it('POST /accounts devolve 404 quando o grupo de contas é de outro usuário (RN010, RN011)', async () => {
    const response = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ accountGroupId: otherUserAccountGroupId, name: 'Carteira', color: '#1E88E5' })

    expect(response.statusCode).toBe(404)
    expect(response.body.code).toBe('RESOURCE_NOT_FOUND')
  })

  it('POST /accounts devolve 404 quando o grupo de contas não existe', async () => {
    const response = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ accountGroupId: randomUUID(), name: 'Carteira', color: '#1E88E5' })

    expect(response.statusCode).toBe(404)
    expect(response.body.code).toBe('RESOURCE_NOT_FOUND')
  })

  it('POST /accounts recusa o grupo de contas do tipo "Cartão de Crédito" (RN019)', async () => {
    const response = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ accountGroupId: creditCardAccountGroupId, name: 'Cartão', color: '#1E88E5' })

    expect(response.statusCode).toBe(400)
    expect(response.body.code).toBe('INVALID_ACCOUNT_GROUP_TYPE')
  })

  it('POST /accounts rejeita a cor fora do formato hexadecimal com 422 (RN018)', async () => {
    const response = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ accountGroupId, name: 'Carteira', color: 'azul' })

    expect(response.statusCode).toBe(422)
    expect(response.body.code).toBe('VALIDATION_FAILED')
    expect(response.body.details.map((detail: { field: string }) => detail.field)).toEqual(['color'])
  })

  it('POST /accounts rejeita o saldo inicial fracionário com 422 (RNF004)', async () => {
    const response = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ accountGroupId, name: 'Carteira', initialBalance: 150.55, color: '#1E88E5' })

    expect(response.statusCode).toBe(422)
    expect(response.body.details.map((detail: { field: string }) => detail.field)).toEqual(['initialBalance'])
  })

  it('POST /accounts rejeita o ícone fora do formato permitido com 422 (RN018)', async () => {
    const response = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ accountGroupId, name: 'Carteira', icon: 'carteira grande', color: '#1E88E5' })

    expect(response.statusCode).toBe(422)
    expect(response.body.code).toBe('INVARIANT_VIOLATION')
  })

  it('POST /accounts rejeita requisição sem token de acesso com 401', async () => {
    const response = await request(app.getHttpServer()).post('/accounts').send({ accountGroupId, name: 'Carteira', color: '#1E88E5' })

    expect(response.statusCode).toBe(401)
    expect(response.body.code).toBe('UNAUTHENTICATED')
  })
})
