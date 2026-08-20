import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { App } from 'supertest/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '@app.module'
import { cleanDatabase } from '@tests/database/clean-database'

describe('Registrar transferência entre contas (e2e)', () => {
  let app: INestApplication<App>
  let accessToken: string
  let sourceAccountId: string
  let destinationAccountId: string
  let creditCardAccountId: string

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

    const source = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ accountGroupId: accountGroup.body.accountGroup.id as string, name: 'Carteira', initialBalance: 10000, color: '#1E88E5' })

    sourceAccountId = source.body.account.id as string

    const destination = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ accountGroupId: accountGroup.body.accountGroup.id as string, name: 'Poupança', initialBalance: 2000, color: '#43A047' })

    destinationAccountId = destination.body.account.id as string

    const creditCardAccountGroup = await request(app.getHttpServer())
      .post('/account-groups')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Cartões', type: 'CREDIT_CARD' })

    const creditCardAccount = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        accountGroupId: creditCardAccountGroup.body.accountGroup.id as string,
        name: 'Cartão',
        color: '#8E24AA',
        creditCard: { limit: 500000, closingDay: 20, dueDay: 28 },
      })

    creditCardAccountId = creditCardAccount.body.account.id as string
  })

  afterAll(async () => {
    await app.close()
  })

  it('POST /transactions/transfers registra a transferência sem categoria (RN043, RN044)', async () => {
    const response = await request(app.getHttpServer())
      .post('/transactions/transfers')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ sourceAccountId, destinationAccountId, status: 'SETTLED', date: '2026-01-10', amount: 3000, description: 'Transferência para poupança' })

    expect(response.statusCode).toBe(201)
    expect(response.body.transaction).toEqual(
      expect.objectContaining({
        id: expect.any(String) as string,
        accountId: null,
        categoryId: null,
        sourceAccountId,
        destinationAccountId,
        type: 'TRANSFER',
        status: 'SETTLED',
        amount: { amountInCents: 3000, formatted: '30.00' },
        description: 'Transferência para poupança',
      }),
    )
  })

  it('POST /transactions/transfers debita a origem e credita o destino pelo mesmo valor (RNF008)', async () => {
    await request(app.getHttpServer())
      .post('/transactions/transfers')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ sourceAccountId, destinationAccountId, status: 'SETTLED', date: '2026-01-11', amount: 1500 })

    const accountsResponse = await request(app.getHttpServer()).get('/accounts').set('Authorization', `Bearer ${accessToken}`)

    const accountsList = accountsResponse.body.accounts as Array<{ id: string; balance: { amountInCents: number } | null }>
    const source = accountsList.find(account => account.id === sourceAccountId)
    const destination = accountsList.find(account => account.id === destinationAccountId)

    expect(source?.balance?.amountInCents).toBe(10000 - 3000 - 1500)
    expect(destination?.balance?.amountInCents).toBe(2000 + 3000 + 1500)
  })

  it('POST /transactions/transfers ignora a categoria informada, criando a transferência sem categoria (RN043)', async () => {
    const response = await request(app.getHttpServer())
      .post('/transactions/transfers')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ sourceAccountId, destinationAccountId, categoryId: randomUUID(), status: 'SETTLED', date: '2026-01-10', amount: 1000 })

    expect(response.statusCode).toBe(201)
    expect(response.body.transaction.categoryId).toBeNull()
  })

  it('POST /transactions/transfers rejeita origem igual a destino com 400 (RN046)', async () => {
    const response = await request(app.getHttpServer())
      .post('/transactions/transfers')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ sourceAccountId, destinationAccountId: sourceAccountId, status: 'SETTLED', date: '2026-01-10', amount: 1000 })

    expect(response.statusCode).toBe(400)
    expect(response.body.code).toBe('INVALID_TRANSFER_ACCOUNT')
  })

  it('POST /transactions/transfers rejeita conta de grupo do tipo "Cartão de Crédito" com 400 (RN045)', async () => {
    const response = await request(app.getHttpServer())
      .post('/transactions/transfers')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ sourceAccountId, destinationAccountId: creditCardAccountId, status: 'SETTLED', date: '2026-01-10', amount: 1000 })

    expect(response.statusCode).toBe(400)
    expect(response.body.code).toBe('INVALID_TRANSFER_ACCOUNT')
  })

  it('POST /transactions/transfers devolve 404 quando a conta de origem não existe', async () => {
    const response = await request(app.getHttpServer())
      .post('/transactions/transfers')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ sourceAccountId: randomUUID(), destinationAccountId, status: 'SETTLED', date: '2026-01-10', amount: 1000 })

    expect(response.statusCode).toBe(404)
    expect(response.body.code).toBe('RESOURCE_NOT_FOUND')
  })

  it('POST /transactions/transfers rejeita requisição sem token de acesso com 401', async () => {
    const response = await request(app.getHttpServer())
      .post('/transactions/transfers')
      .send({ sourceAccountId, destinationAccountId, status: 'SETTLED', date: '2026-01-10', amount: 1000 })

    expect(response.statusCode).toBe(401)
    expect(response.body.code).toBe('UNAUTHENTICATED')
  })
})
