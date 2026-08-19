import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { App } from 'supertest/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '@app.module'
import { DrizzleService } from '@infra/database/drizzle/drizzle.service'
import { transactions } from '@infra/database/drizzle/schemas/transactions'
import { users } from '@infra/database/drizzle/schemas/users'
import { cleanDatabase } from '@tests/database/clean-database'

describe('Registrar transação (e2e)', () => {
  let app: INestApplication<App>
  let drizzle: DrizzleService
  let accessToken: string
  let accountId: string
  let expenseCategoryId: string
  let incomeCategoryId: string
  let archivedCategoryId: string

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    drizzle = app.get(DrizzleService)

    await cleanDatabase(app)

    await request(app.getHttpServer()).post('/users').send({ name: 'Fulano de Tal', email: 'fulano@exemplo.com', password: 'senha-secreta' })

    const session = await request(app.getHttpServer()).post('/sessions').send({ email: 'fulano@exemplo.com', password: 'senha-secreta' })

    accessToken = session.body.accessToken as string

    const accountGroup = await request(app.getHttpServer())
      .post('/account-groups')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Contas', type: 'DEFAULT' })

    const account = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ accountGroupId: accountGroup.body.accountGroup.id as string, name: 'Carteira', color: '#1E88E5' })

    accountId = account.body.account.id as string

    const expenseCategory = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Alimentação', nature: 'EXPENSE', icon: 'restaurant', color: '#E53935' })

    expenseCategoryId = expenseCategory.body.category.id as string

    const incomeCategory = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Salário', nature: 'INCOME', icon: 'cash', color: '#43A047' })

    incomeCategoryId = incomeCategory.body.category.id as string

    const archivedCategory = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Descontinuada', nature: 'EXPENSE', icon: 'archive', color: '#757575' })

    archivedCategoryId = archivedCategory.body.category.id as string

    await request(app.getHttpServer()).patch(`/categories/${archivedCategoryId}/archive`).set('Authorization', `Bearer ${accessToken}`)
  })

  afterAll(async () => {
    await app.close()
  })

  it('POST /transactions registra a transação de despesa', async () => {
    const response = await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        accountId,
        categoryId: expenseCategoryId,
        type: 'EXPENSE',
        status: 'SETTLED',
        date: '2026-01-10',
        amount: 5000,
        description: 'Supermercado',
      })

    expect(response.statusCode).toBe(201)
    expect(response.body.transaction).toEqual(
      expect.objectContaining({
        id: expect.any(String) as string,
        accountId,
        categoryId: expenseCategoryId,
        type: 'EXPENSE',
        status: 'SETTLED',
        amount: { amountInCents: 5000, formatted: '50.00' },
        description: 'Supermercado',
      }),
    )
  })

  it('POST /transactions registra a transação sem status informado, derivando a situação pela data (RN049)', async () => {
    const response = await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ accountId, categoryId: expenseCategoryId, type: 'EXPENSE', date: '2000-01-10', amount: 1000 })

    expect(response.statusCode).toBe(201)
    expect(response.body.transaction.status).toBe('SETTLED')
  })

  it('POST /transactions registra a transação de receita (RN039)', async () => {
    const response = await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ accountId, categoryId: incomeCategoryId, type: 'INCOME', status: 'PLANNED', date: '2026-02-01', amount: 300000 })

    expect(response.statusCode).toBe(201)
    expect(response.body.transaction.type).toBe('INCOME')
    expect(response.body.transaction.status).toBe('PLANNED')
  })

  it('POST /transactions persiste a transação vinculada ao usuário autenticado (RN010)', async () => {
    const created = await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ownerId: randomUUID(), accountId, categoryId: expenseCategoryId, type: 'EXPENSE', status: 'SETTLED', date: '2026-01-15', amount: 1000 })

    const [record] = await drizzle.db
      .select()
      .from(transactions)
      .where(eq(transactions.id, created.body.transaction.id as string))

    const [user] = await drizzle.db.select().from(users).where(eq(users.email, 'fulano@exemplo.com'))

    expect(record.ownerId).toBe(user.id)
  })

  it('POST /transactions rejeita valor menor ou igual a zero com 422 (RN041)', async () => {
    const response = await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ accountId, categoryId: expenseCategoryId, type: 'EXPENSE', status: 'SETTLED', date: '2026-01-10', amount: 0 })

    expect(response.statusCode).toBe(422)
    expect(response.body.code).toBe('INVARIANT_VIOLATION')
  })

  it('POST /transactions rejeita categoria de natureza incompatível com o tipo com 400 (RN042)', async () => {
    const response = await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ accountId, categoryId: incomeCategoryId, type: 'EXPENSE', status: 'SETTLED', date: '2026-01-10', amount: 1000 })

    expect(response.statusCode).toBe(400)
    expect(response.body.code).toBe('CATEGORY_NATURE_MISMATCH')
  })

  it('POST /transactions rejeita categoria arquivada com 400 (RN035)', async () => {
    const response = await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ accountId, categoryId: archivedCategoryId, type: 'EXPENSE', status: 'SETTLED', date: '2026-01-10', amount: 1000 })

    expect(response.statusCode).toBe(400)
    expect(response.body.code).toBe('RESOURCE_ARCHIVED')
  })

  it('POST /transactions devolve 404 quando a conta não existe', async () => {
    const response = await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ accountId: randomUUID(), categoryId: expenseCategoryId, type: 'EXPENSE', status: 'SETTLED', date: '2026-01-10', amount: 1000 })

    expect(response.statusCode).toBe(404)
    expect(response.body.code).toBe('RESOURCE_NOT_FOUND')
  })

  it('POST /transactions devolve 404 quando a categoria não existe', async () => {
    const response = await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ accountId, categoryId: randomUUID(), type: 'EXPENSE', status: 'SETTLED', date: '2026-01-10', amount: 1000 })

    expect(response.statusCode).toBe(404)
    expect(response.body.code).toBe('RESOURCE_NOT_FOUND')
  })

  it('POST /transactions rejeita requisição sem token de acesso com 401', async () => {
    const response = await request(app.getHttpServer())
      .post('/transactions')
      .send({ accountId, categoryId: expenseCategoryId, type: 'EXPENSE', status: 'SETTLED', date: '2026-01-10', amount: 1000 })

    expect(response.statusCode).toBe(401)
    expect(response.body.code).toBe('UNAUTHENTICATED')
  })
})
