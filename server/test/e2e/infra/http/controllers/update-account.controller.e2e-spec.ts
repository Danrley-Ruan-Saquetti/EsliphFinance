import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { App } from 'supertest/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '@app.module'
import { cleanDatabase } from '@tests/database/clean-database'

describe('Editar conta (e2e)', () => {
  let app: INestApplication<App>
  let accessToken: string
  let accountGroupId: string
  let otherAccountGroupId: string
  let creditCardAccountGroupId: string
  let otherUserAccountGroupId: string

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

    const otherAccountGroup = await request(app.getHttpServer())
      .post('/account-groups')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Reservas', type: 'DEFAULT' })

    otherAccountGroupId = otherAccountGroup.body.accountGroup.id as string

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

  it('PUT /accounts/:id edita nome, ícone, cor e saldo inicial de uma conta padrão (RN018)', async () => {
    const created = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ accountGroupId, name: 'Carteira', initialBalance: 15000, icon: 'wallet', color: '#1E88E5' })

    const response = await request(app.getHttpServer())
      .put(`/accounts/${created.body.account.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ accountGroupId, name: 'Conta corrente', initialBalance: 90000, icon: 'bank', color: '#43A047' })

    expect(response.statusCode).toBe(200)
    expect(response.body.account).toEqual(
      expect.objectContaining({
        id: created.body.account.id,
        name: 'Conta corrente',
        initialBalance: { amountInCents: 90000, formatted: '900.00' },
        icon: 'bank',
        color: '#43A047',
      }),
    )
  })

  it('PUT /accounts/:id edita nome, ícone, cor, limite, dia de fechamento e dia de vencimento de uma conta de cartão de crédito (RN019)', async () => {
    const created = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        accountGroupId: creditCardAccountGroupId,
        name: 'Cartão',
        color: '#1E88E5',
        creditCard: { limit: 500000, closingDay: 20, dueDay: 28 },
      })

    const response = await request(app.getHttpServer())
      .put(`/accounts/${created.body.account.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        accountGroupId: creditCardAccountGroupId,
        name: 'Cartão Platinum',
        icon: 'credit-card',
        color: '#8E24AA',
        creditCard: { limit: 900000, closingDay: 10, dueDay: 17 },
      })

    expect(response.statusCode).toBe(200)
    expect(response.body.account).toEqual(
      expect.objectContaining({
        name: 'Cartão Platinum',
        icon: 'credit-card',
        color: '#8E24AA',
        creditCard: { limit: { amountInCents: 900000, formatted: '9000.00' }, closingDay: 10, dueDay: 17 },
      }),
    )
  })

  it('PUT /accounts/:id permite trocar de grupo entre grupos do mesmo tipo (RN018)', async () => {
    const created = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ accountGroupId, name: 'Poupança', color: '#1E88E5' })

    const response = await request(app.getHttpServer())
      .put(`/accounts/${created.body.account.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ accountGroupId: otherAccountGroupId, name: 'Poupança', color: '#1E88E5' })

    expect(response.statusCode).toBe(200)
    expect(response.body.account.accountGroupId).toBe(otherAccountGroupId)
  })

  it('PUT /accounts/:id rejeita a troca para um grupo de tipo diferente com 400 (RN018, RN019)', async () => {
    const created = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ accountGroupId, name: 'Carteira', color: '#1E88E5' })

    const response = await request(app.getHttpServer())
      .put(`/accounts/${created.body.account.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        accountGroupId: creditCardAccountGroupId,
        name: 'Carteira',
        color: '#1E88E5',
        creditCard: { limit: 500000, closingDay: 20, dueDay: 28 },
      })

    expect(response.statusCode).toBe(400)
    expect(response.body.code).toBe('INVALID_ACCOUNT_GROUP_TYPE')
  })

  it('PUT /accounts/:id devolve 404 quando a conta não existe', async () => {
    const response = await request(app.getHttpServer())
      .put(`/accounts/${randomUUID()}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ accountGroupId, name: 'Carteira', color: '#1E88E5' })

    expect(response.statusCode).toBe(404)
    expect(response.body.code).toBe('RESOURCE_NOT_FOUND')
  })

  it('PUT /accounts/:id devolve 404 quando a conta é de outro usuário (RN010, RN011)', async () => {
    const created = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ accountGroupId, name: 'Carteira', color: '#1E88E5' })

    const otherSession = await request(app.getHttpServer()).post('/sessions').send({ email: 'ciclano@exemplo.com', password: 'senha-secreta' })

    const response = await request(app.getHttpServer())
      .put(`/accounts/${created.body.account.id}`)
      .set('Authorization', `Bearer ${otherSession.body.accessToken as string}`)
      .send({ accountGroupId: otherUserAccountGroupId, name: 'Invadida', color: '#1E88E5' })

    expect(response.statusCode).toBe(404)
    expect(response.body.code).toBe('RESOURCE_NOT_FOUND')
  })

  it('PUT /accounts/:id rejeita a cor fora do formato hexadecimal com 422 (RN018)', async () => {
    const created = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ accountGroupId, name: 'Carteira', color: '#1E88E5' })

    const response = await request(app.getHttpServer())
      .put(`/accounts/${created.body.account.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ accountGroupId, name: 'Carteira', color: 'azul' })

    expect(response.statusCode).toBe(422)
    expect(response.body.code).toBe('VALIDATION_FAILED')
  })

  it('PUT /accounts/:id rejeita requisição sem token de acesso com 401', async () => {
    const response = await request(app.getHttpServer())
      .put(`/accounts/${randomUUID()}`)
      .send({ accountGroupId, name: 'Carteira', color: '#1E88E5' })

    expect(response.statusCode).toBe(401)
    expect(response.body.code).toBe('UNAUTHENTICATED')
  })
})
