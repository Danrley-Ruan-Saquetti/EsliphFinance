import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { App } from 'supertest/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '@app.module'
import { DrizzleService } from '@infra/database/drizzle/drizzle.service'
import { categories } from '@infra/database/drizzle/schemas/categories'
import { users } from '@infra/database/drizzle/schemas/users'
import { cleanDatabase } from '@tests/database/clean-database'

describe('Criar categoria (e2e)', () => {
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

    await cleanDatabase(app)

    await request(app.getHttpServer()).post('/users').send({ name: 'Fulano de Tal', email: 'fulano@exemplo.com', password: 'senha-secreta' })

    const session = await request(app.getHttpServer()).post('/sessions').send({ email: 'fulano@exemplo.com', password: 'senha-secreta' })

    accessToken = session.body.accessToken as string
  })

  afterAll(async () => {
    await app.close()
  })

  it('POST /categories cria a categoria', async () => {
    const response = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Alimentação', nature: 'EXPENSE', icon: 'restaurant', color: '#E53935' })

    expect(response.statusCode).toBe(201)
    expect(response.body.category).toEqual(
      expect.objectContaining({ id: expect.any(String) as string, name: 'Alimentação', nature: 'EXPENSE', icon: 'restaurant', color: '#E53935' }),
    )
  })

  it('POST /categories persiste a categoria vinculada ao usuário autenticado (RN010)', async () => {
    const created = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ownerId: randomUUID(), name: 'Salário', nature: 'INCOME', icon: 'cash', color: '#43A047' })

    const [record] = await drizzle.db
      .select()
      .from(categories)
      .where(eq(categories.id, created.body.category.id as string))

    const [user] = await drizzle.db.select().from(users).where(eq(users.email, 'fulano@exemplo.com'))

    expect(record.ownerId).toBe(user.id)
  })

  it('POST /categories rejeita corpo inválido com 422', async () => {
    const response = await request(app.getHttpServer()).post('/categories').set('Authorization', `Bearer ${accessToken}`).send({ name: '' })

    expect(response.statusCode).toBe(422)
    expect(response.body.code).toBe('VALIDATION_FAILED')
    expect(response.body.details.map((detail: { field: string }) => detail.field)).toEqual(['name', 'nature', 'icon', 'color'])
  })

  it('POST /categories rejeita natureza fora do domínio permitido com 422 (RN030)', async () => {
    const response = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Transferências', nature: 'TRANSFER', icon: 'swap', color: '#E53935' })

    expect(response.statusCode).toBe(422)
    expect(response.body.details.map((detail: { field: string }) => detail.field)).toEqual(['nature'])
  })

  it('POST /categories rejeita requisição sem token de acesso com 401', async () => {
    const response = await request(app.getHttpServer())
      .post('/categories')
      .send({ name: 'Alimentação', nature: 'EXPENSE', icon: 'restaurant', color: '#E53935' })

    expect(response.statusCode).toBe(401)
    expect(response.body.code).toBe('UNAUTHENTICATED')
  })

  it('POST /categories vincula a categoria a um pai compatível (RN031)', async () => {
    const parent = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Alimentação', nature: 'EXPENSE', icon: 'restaurant', color: '#E53935' })

    const response = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ parentId: parent.body.category.id as string, name: 'Restaurante', nature: 'EXPENSE', icon: 'restaurant', color: '#E53935' })

    expect(response.statusCode).toBe(201)
    expect(response.body.category.parentId).toBe(parent.body.category.id)
  })

  it('POST /categories rejeita natureza de subcategoria incompatível com o pai com 400 (RN033)', async () => {
    const parent = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Alimentação', nature: 'EXPENSE', icon: 'restaurant', color: '#E53935' })

    const response = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ parentId: parent.body.category.id as string, name: 'Salário', nature: 'INCOME', icon: 'cash', color: '#43A047' })

    expect(response.statusCode).toBe(400)
    expect(response.body.code).toBe('INCOMPATIBLE_CATEGORY_NATURE')
  })

  it('POST /categories rejeita vincular a uma categoria que já é subcategoria com 400 (RN032)', async () => {
    const grandparent = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Alimentação', nature: 'EXPENSE', icon: 'restaurant', color: '#E53935' })

    const parent = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ parentId: grandparent.body.category.id as string, name: 'Restaurante', nature: 'EXPENSE', icon: 'restaurant', color: '#E53935' })

    const response = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ parentId: parent.body.category.id as string, name: 'Delivery', nature: 'EXPENSE', icon: 'restaurant', color: '#E53935' })

    expect(response.statusCode).toBe(400)
    expect(response.body.code).toBe('INVALID_CATEGORY_HIERARCHY')
  })

  it('POST /categories rejeita categoria pai inexistente com 404', async () => {
    const response = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ parentId: randomUUID(), name: 'Restaurante', nature: 'EXPENSE', icon: 'restaurant', color: '#E53935' })

    expect(response.statusCode).toBe(404)
    expect(response.body.code).toBe('RESOURCE_NOT_FOUND')
  })
})
