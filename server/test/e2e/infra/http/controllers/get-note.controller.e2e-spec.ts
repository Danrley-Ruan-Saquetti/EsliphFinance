import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { App } from 'supertest/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '@app.module'
import { DrizzleService } from '@infra/database/drizzle/drizzle.service'
import { notes } from '@infra/database/drizzle/schemas/notes'

describe('Consultar nota (e2e)', () => {
  let app: INestApplication<App>

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    await app.get(DrizzleService).db.delete(notes)
  })

  afterAll(async () => {
    await app.close()
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
