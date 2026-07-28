import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { App } from 'supertest/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '@app.module'
import { GetNoteUseCase } from '@domain/example/application/use-cases/get-note'
import { DrizzleService } from '@infra/database/drizzle/drizzle.service'
import { notes } from '@infra/database/drizzle/schemas/notes'
import { RequestIdMiddleware } from '@infra/http/middlewares/request-id-middleware'

describe('Contrato de erro da API (e2e)', () => {
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

  it('responde erro de validação com 422 e a lista de campos', async () => {
    const response = await request(app.getHttpServer()).post('/notes').send({ ownerId: 'não-é-uuid', title: '', content: '' })

    expect(response.statusCode).toBe(422)
    expect(response.body).toEqual(
      expect.objectContaining({
        statusCode: 422,
        code: 'VALIDATION_FAILED',
        message: 'Validation failed',
        path: '/notes',
        timestamp: expect.any(String) as string,
        requestId: expect.any(String) as string,
      }),
    )
    expect(response.body.details).toContainEqual(expect.objectContaining({ field: 'ownerId', message: expect.any(String) as string }))
  })

  it('responde erro de regra de negócio com o código identificável', async () => {
    const response = await request(app.getHttpServer()).get(`/notes/${randomUUID()}`).query({ ownerId: randomUUID() })

    expect(response.statusCode).toBe(404)
    expect(response.body.code).toBe('RESOURCE_NOT_FOUND')
    expect(response.body.message).toBe('Note not found')
    expect(response.body.details).toBeUndefined()
  })

  it('responde 403 com o código identificável quando o registro é de outro usuário (RN010, RN011)', async () => {
    const created = await request(app.getHttpServer()).post('/notes').send({ ownerId: randomUUID(), title: 'Título', content: 'Conteúdo' })

    const response = await request(app.getHttpServer()).get(`/notes/${created.body.note.id}`).query({ ownerId: randomUUID() })

    expect(response.statusCode).toBe(403)
    expect(response.body.code).toBe('NOT_ALLOWED')
  })

  it('responde rota inexistente no mesmo contrato de erro', async () => {
    const response = await request(app.getHttpServer()).get('/rota-inexistente')

    expect(response.statusCode).toBe(404)
    expect(response.body.code).toBe('NOT_FOUND')
    expect(response.body.path).toBe('/rota-inexistente')
  })

  it('devolve o identificador de requisição enviado pelo cliente no corpo e no header', async () => {
    const response = await request(app.getHttpServer())
      .get(`/notes/${randomUUID()}`)
      .set(RequestIdMiddleware.HEADER, 'correlation-e2e')
      .query({ ownerId: randomUUID() })

    expect(response.body.requestId).toBe('correlation-e2e')
    expect(response.headers[RequestIdMiddleware.HEADER]).toBe('correlation-e2e')
  })
})

describe('Contrato de erro inesperado da API (e2e)', () => {
  let app: INestApplication<App>

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GetNoteUseCase)
      .useValue({ execute: () => Promise.reject(new Error('Connection terminated unexpectedly')) })
      .compile()

    app = moduleFixture.createNestApplication({ logger: false })
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('responde 500 sem vazar a mensagem nem o stack trace', async () => {
    const response = await request(app.getHttpServer()).get(`/notes/${randomUUID()}`).query({ ownerId: randomUUID() })

    expect(response.statusCode).toBe(500)
    expect(response.body.code).toBe('INTERNAL_SERVER_ERROR')
    expect(response.body.message).toBe('Internal server error')
    expect(response.body.requestId).toEqual(expect.any(String))
    expect(JSON.stringify(response.body)).not.toContain('Connection terminated unexpectedly')
    expect(response.body.stack).toBeUndefined()
  })
})
