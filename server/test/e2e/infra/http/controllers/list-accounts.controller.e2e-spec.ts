import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { eq } from 'drizzle-orm'
import request from 'supertest'
import { App } from 'supertest/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '@app.module'
import { DrizzleService } from '@infra/database/drizzle/drizzle.service'
import { accounts } from '@infra/database/drizzle/schemas/accounts'
import { cleanDatabase } from '@tests/database/clean-database'

describe('Listar contas (e2e)', () => {
  let app: INestApplication<App>
  let drizzle: DrizzleService
  let accessToken: string
  let accountGroupId: string
  let creditCardAccountGroupId: string
  let archivedAccountId: string

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    drizzle = app.get(DrizzleService)

    await cleanDatabase(app)

    await request(app.getHttpServer()).post('/users').send({ name: 'Fulano de Tal', email: 'fulano@exemplo.com', password: 'senha-secreta' })
    await request(app.getHttpServer()).post('/users').send({ name: 'Beltrano de Tal', email: 'beltrano@exemplo.com', password: 'senha-secreta' })

    const session = await request(app.getHttpServer()).post('/sessions').send({ email: 'fulano@exemplo.com', password: 'senha-secreta' })
    const anotherSession = await request(app.getHttpServer()).post('/sessions').send({ email: 'beltrano@exemplo.com', password: 'senha-secreta' })

    accessToken = session.body.accessToken as string

    const anotherAccessToken = anotherSession.body.accessToken as string

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

    await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ accountGroupId, name: 'Carteira', initialBalance: 15000, icon: 'wallet', color: '#1E88E5' })

    await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        accountGroupId: creditCardAccountGroupId,
        name: 'Cartão Nubank',
        color: '#8A05BE',
        creditCard: { limit: 500000, closingDay: 20, dueDay: 28 },
      })

    const archivedAccount = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ accountGroupId, name: 'Conta antiga', color: '#1E88E5' })

    archivedAccountId = archivedAccount.body.account.id as string

    await drizzle.db.update(accounts).set({ archivedAt: new Date() }).where(eq(accounts.id, archivedAccountId))

    const otherUserAccountGroup = await request(app.getHttpServer())
      .post('/account-groups')
      .set('Authorization', `Bearer ${anotherAccessToken}`)
      .send({ name: 'Contas do Beltrano' })

    await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${anotherAccessToken}`)
      .send({ accountGroupId: otherUserAccountGroup.body.accountGroup.id as string, name: 'Conta do Beltrano', color: '#1E88E5' })
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /accounts lista as contas do usuário autenticado com o saldo calculado (RN010, RN011, RN021)', async () => {
    const response = await request(app.getHttpServer()).get('/accounts').set('Authorization', `Bearer ${accessToken}`)

    expect(response.statusCode).toBe(200)
    expect(response.body.accounts).toHaveLength(3)
    expect(response.body.accounts).toContainEqual(
      expect.objectContaining({
        id: expect.any(String) as string,
        accountGroupId,
        name: 'Carteira',
        initialBalance: { amountInCents: 15000, formatted: '150.00' },
        balance: { amountInCents: 15000, formatted: '150.00' },
        creditCard: null,
        archivedAt: null,
      }),
    )
  })

  it('GET /accounts devolve a conta de cartão de crédito sem saldo e com o limite disponível (RN022, RN023)', async () => {
    const response = await request(app.getHttpServer())
      .get('/accounts')
      .query({ accountGroupType: 'CREDIT_CARD' })
      .set('Authorization', `Bearer ${accessToken}`)

    expect(response.statusCode).toBe(200)
    expect(response.body.accounts).toHaveLength(1)
    expect(response.body.accounts[0].balance).toBeNull()
    expect(response.body.accounts[0].creditCard).toEqual({
      limit: { amountInCents: 500000, formatted: '5000.00' },
      availableLimit: { amountInCents: 500000, formatted: '5000.00' },
      closingDay: 20,
      dueDay: 28,
    })
  })

  it('GET /accounts filtra as contas pelo grupo informado', async () => {
    const response = await request(app.getHttpServer()).get('/accounts').query({ accountGroupId }).set('Authorization', `Bearer ${accessToken}`)

    expect(response.statusCode).toBe(200)
    expect(response.body.accounts).toHaveLength(2)
  })

  it('GET /accounts filtra as contas pela situação de arquivamento (RN024, RN025)', async () => {
    const response = await request(app.getHttpServer()).get('/accounts').query({ archived: 'false' }).set('Authorization', `Bearer ${accessToken}`)

    expect(response.statusCode).toBe(200)
    expect(response.body.accounts).toHaveLength(2)
    expect(response.body.accounts.map((account: { name: string }) => account.name)).not.toContain('Conta antiga')
  })

  it('GET /accounts rejeita tipo de grupo fora do domínio permitido com 422 (RN015)', async () => {
    const response = await request(app.getHttpServer()).get('/accounts').query({ accountGroupType: 'INVESTMENT' }).set('Authorization', `Bearer ${accessToken}`)

    expect(response.statusCode).toBe(422)
    expect(response.body.code).toBe('VALIDATION_FAILED')
    expect(response.body.details.map((detail: { field: string }) => detail.field)).toEqual(['accountGroupType'])
  })

  it('GET /accounts rejeita requisição sem token de acesso com 401', async () => {
    const response = await request(app.getHttpServer()).get('/accounts')

    expect(response.statusCode).toBe(401)
    expect(response.body.code).toBe('UNAUTHENTICATED')
  })
})
