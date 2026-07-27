import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { App } from 'supertest/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '@app.module'

describe('Notes (e2e)', () => {
  let app: INestApplication<App>

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('POST /notes cria a nota', async () => {
    const ownerId = randomUUID()

    const response = await request(app.getHttpServer()).post('/notes').send({ ownerId, title: 'Título', content: 'Conteúdo' })

    expect(response.statusCode).toBe(201)
    expect(response.body.note).toEqual(expect.objectContaining({ id: expect.any(String) as string, title: 'Título', content: 'Conteúdo' }))
  })

  it('POST /notes rejeita corpo inválido com 400', async () => {
    const response = await request(app.getHttpServer()).post('/notes').send({ ownerId: 'não-é-uuid', title: '', content: 'Conteúdo' })

    expect(response.statusCode).toBe(400)
    expect(response.body.message).toBe('Validation failed')
    expect(response.body.errors.fieldErrors).toHaveProperty('ownerId')
    expect(response.body.errors.fieldErrors).toHaveProperty('title')
  })

  it('GET /notes/:id retorna a nota do próprio dono', async () => {
    const ownerId = randomUUID()

    const created = await request(app.getHttpServer()).post('/notes').send({ ownerId, title: 'Título', content: 'Conteúdo' })
    const response = await request(app.getHttpServer()).get(`/notes/${created.body.note.id}`).query({ ownerId })

    expect(response.statusCode).toBe(200)
    expect(response.body.note.id).toBe(created.body.note.id)
  })

  it('GET /notes/:id responde 404 para nota inexistente', async () => {
    const response = await request(app.getHttpServer()).get(`/notes/${randomUUID()}`).query({ ownerId: randomUUID() })

    expect(response.statusCode).toBe(404)
  })

  it('GET /notes/:id responde 403 para nota de outro usuário', async () => {
    const created = await request(app.getHttpServer()).post('/notes').send({ ownerId: randomUUID(), title: 'Título', content: 'Conteúdo' })

    const response = await request(app.getHttpServer()).get(`/notes/${created.body.note.id}`).query({ ownerId: randomUUID() })

    expect(response.statusCode).toBe(403)
  })
})
