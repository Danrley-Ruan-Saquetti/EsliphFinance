import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { App } from 'supertest/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '@app.module'
import { DrizzleService } from '@infra/database/drizzle/drizzle.service'
import { notes } from '@infra/database/drizzle/schemas/notes'

describe('Criar nota (e2e)', () => {
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

  it('POST /notes cria a nota', async () => {
    const ownerId = randomUUID()

    const response = await request(app.getHttpServer()).post('/notes').send({ ownerId, title: 'Título', content: 'Conteúdo' })

    expect(response.statusCode).toBe(201)
    expect(response.body.note).toEqual(expect.objectContaining({ id: expect.any(String) as string, title: 'Título', content: 'Conteúdo' }))
  })

  it('POST /notes rejeita corpo inválido com 422', async () => {
    const response = await request(app.getHttpServer()).post('/notes').send({ ownerId: 'não-é-uuid', title: '', content: 'Conteúdo' })

    expect(response.statusCode).toBe(422)
    expect(response.body.code).toBe('VALIDATION_FAILED')
    expect(response.body.message).toBe('Validation failed')
    expect(response.body.details.map((detail: { field: string }) => detail.field)).toEqual(['ownerId', 'title'])
  })
})
