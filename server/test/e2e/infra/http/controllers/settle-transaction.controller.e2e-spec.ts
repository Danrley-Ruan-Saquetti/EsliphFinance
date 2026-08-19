import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { App } from 'supertest/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '@app.module'
import { cleanDatabase } from '@tests/database/clean-database'

describe('Efetivar transação (e2e)', () => {
  let app: INestApplication<App>
  let accessToken: string
  let accountGroupId: string
  let categoryId: string

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

    const category = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Salário', nature: 'INCOME', icon: 'cash', color: '#43A047' })

    categoryId = category.body.category.id as string
  })

  afterAll(async () => {
    await app.close()
  })

  async function createAccount(initialBalance = 0): Promise<string> {
    const account = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ accountGroupId, name: 'Carteira', initialBalance, color: '#1E88E5' })

    return account.body.account.id as string
  }

  async function createPlannedTransaction(accountId: string, amount = 5000): Promise<string> {
    const transaction = await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ accountId, categoryId, type: 'INCOME', status: 'PLANNED', date: '2026-06-20', amount })

    return transaction.body.transaction.id as string
  }

  it('PATCH /transactions/:id/settle efetiva a transação prevista (RN048)', async () => {
    const accountId = await createAccount()
    const transactionId = await createPlannedTransaction(accountId)

    const response = await request(app.getHttpServer())
      .patch(`/transactions/${transactionId}/settle`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})

    expect(response.statusCode).toBe(200)
    expect(response.body.transaction.status).toBe('SETTLED')
  })

  it('PATCH /transactions/:id/settle passa a compor o saldo da conta (RN021, RN050)', async () => {
    const accountId = await createAccount(10000)
    const transactionId = await createPlannedTransaction(accountId, 5000)

    await request(app.getHttpServer()).patch(`/transactions/${transactionId}/settle`).set('Authorization', `Bearer ${accessToken}`).send({})

    const accounts = await request(app.getHttpServer()).get('/accounts').query({ accountGroupId }).set('Authorization', `Bearer ${accessToken}`)

    const account = (accounts.body.accounts as Array<{ id: string; balance: { amountInCents: number } }>).find(item => item.id === accountId)

    expect(account?.balance.amountInCents).toBe(15000)
  })

  it('PATCH /transactions/:id/settle permite ajustar a data de efetivação (RN088)', async () => {
    const accountId = await createAccount()
    const transactionId = await createPlannedTransaction(accountId)

    const response = await request(app.getHttpServer())
      .patch(`/transactions/${transactionId}/settle`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ date: '2026-06-22' })

    expect(response.statusCode).toBe(200)
    expect(new Date(response.body.transaction.date as string).toISOString().slice(0, 10)).toBe('2026-06-22')
  })

  it('PATCH /transactions/:id/settle rejeita transação já efetivada com 409 (RN086)', async () => {
    const accountId = await createAccount()
    const transactionId = await createPlannedTransaction(accountId)

    await request(app.getHttpServer()).patch(`/transactions/${transactionId}/settle`).set('Authorization', `Bearer ${accessToken}`).send({})

    const response = await request(app.getHttpServer()).patch(`/transactions/${transactionId}/settle`).set('Authorization', `Bearer ${accessToken}`).send({})

    expect(response.statusCode).toBe(409)
    expect(response.body.code).toBe('TRANSACTION_STATUS_CONFLICT')
  })

  it('PATCH /transactions/:id/settle devolve 404 quando a transação não existe', async () => {
    const response = await request(app.getHttpServer()).patch(`/transactions/${randomUUID()}/settle`).set('Authorization', `Bearer ${accessToken}`).send({})

    expect(response.statusCode).toBe(404)
    expect(response.body.code).toBe('RESOURCE_NOT_FOUND')
  })

  it('PATCH /transactions/:id/settle rejeita requisição sem token de acesso com 401', async () => {
    const response = await request(app.getHttpServer()).patch(`/transactions/${randomUUID()}/settle`).send()

    expect(response.statusCode).toBe(401)
    expect(response.body.code).toBe('UNAUTHENTICATED')
  })
})
