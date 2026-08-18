import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { App } from 'supertest/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '@app.module'
import { cleanDatabase } from '@tests/database/clean-database'

describe('Excluir categoria (e2e)', () => {
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

  it('DELETE /categories/:id exclui a categoria sem vínculo (RN034)', async () => {
    const created = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Alimentação', nature: 'EXPENSE', icon: 'restaurant', color: '#E53935' })

    const response = await request(app.getHttpServer())
      .delete(`/categories/${created.body.category.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send()

    expect(response.statusCode).toBe(204)
  })

  it('DELETE /categories/:id rejeita exclusão com subcategoria vinculada com 403 (RN034)', async () => {
    const parent = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Alimentação', nature: 'EXPENSE', icon: 'restaurant', color: '#E53935' })

    await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ parentId: parent.body.category.id as string, name: 'Restaurante', nature: 'EXPENSE', icon: 'restaurant', color: '#E53935' })

    const response = await request(app.getHttpServer())
      .delete(`/categories/${parent.body.category.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send()

    expect(response.statusCode).toBe(403)
    expect(response.body.code).toBe('NOT_ALLOWED')
  })

  it('DELETE /categories/:id rejeita categoria inexistente com 404', async () => {
    const response = await request(app.getHttpServer()).delete(`/categories/${randomUUID()}`).set('Authorization', `Bearer ${accessToken}`).send()

    expect(response.statusCode).toBe(404)
    expect(response.body.code).toBe('RESOURCE_NOT_FOUND')
  })

  it('DELETE /categories/:id rejeita requisição sem token de acesso com 401', async () => {
    const response = await request(app.getHttpServer()).delete(`/categories/${randomUUID()}`).send()

    expect(response.statusCode).toBe(401)
    expect(response.body.code).toBe('UNAUTHENTICATED')
  })
})
