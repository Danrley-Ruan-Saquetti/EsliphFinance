import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '@app.module'
import { cleanDatabase } from '@tests/database/clean-database'

describe('Listar categorias em árvore (e2e)', () => {
  let app: INestApplication<App>
  let accessToken: string

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
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /categories devolve a categoria raiz com a subcategoria aninhada (RN031)', async () => {
    const root = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Alimentação', nature: 'EXPENSE', icon: 'restaurant', color: '#E53935' })

    await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ parentId: root.body.category.id, name: 'Restaurante', nature: 'EXPENSE', icon: 'fork', color: '#E53935' })

    const response = await request(app.getHttpServer()).get('/categories').set('Authorization', `Bearer ${accessToken}`)

    expect(response.statusCode).toBe(200)
    const found = response.body.categories.find((category: { id: string }) => category.id === root.body.category.id)

    expect(found.children).toHaveLength(1)
    expect(found.children[0].name).toBe('Restaurante')
  })

  it('GET /categories omite categorias arquivadas por padrão e as inclui com includeArchived=true (RN035)', async () => {
    const created = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Assinaturas', nature: 'EXPENSE', icon: 'card', color: '#3949AB' })

    await request(app.getHttpServer()).patch(`/categories/${created.body.category.id}/archive`).set('Authorization', `Bearer ${accessToken}`).send()

    const withoutArchived = await request(app.getHttpServer()).get('/categories').set('Authorization', `Bearer ${accessToken}`)

    expect(withoutArchived.body.categories.some((category: { id: string }) => category.id === created.body.category.id)).toBe(false)

    const withArchived = await request(app.getHttpServer()).get('/categories?includeArchived=true').set('Authorization', `Bearer ${accessToken}`)

    expect(withArchived.body.categories.some((category: { id: string }) => category.id === created.body.category.id)).toBe(true)
  })

  it('GET /categories filtra pela natureza informada', async () => {
    await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Salário', nature: 'INCOME', icon: 'cash', color: '#43A047' })

    const response = await request(app.getHttpServer()).get('/categories?nature=INCOME').set('Authorization', `Bearer ${accessToken}`)

    expect(response.statusCode).toBe(200)
    expect(response.body.categories.every((category: { nature: string }) => category.nature === 'INCOME')).toBe(true)
  })

  it('GET /categories rejeita requisição sem token de acesso com 401', async () => {
    const response = await request(app.getHttpServer()).get('/categories')

    expect(response.statusCode).toBe(401)
    expect(response.body.code).toBe('UNAUTHENTICATED')
  })
})
