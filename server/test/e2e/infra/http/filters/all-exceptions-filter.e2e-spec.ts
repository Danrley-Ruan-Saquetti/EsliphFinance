import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { App } from 'supertest/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '@app.module'
import { GetNoteUseCase } from '@domain/example/application/use-cases/get-note'
import { DrizzleService } from '@infra/database/drizzle/drizzle.service'
import { assetGroups } from '@infra/database/drizzle/schemas/asset-groups'
import { notes } from '@infra/database/drizzle/schemas/notes'
import { refreshTokens } from '@infra/database/drizzle/schemas/refresh-tokens'
import { users } from '@infra/database/drizzle/schemas/users'
import { RequestIdMiddleware } from '@infra/http/middlewares/request-id-middleware'

async function registerAndAuthenticate(app: INestApplication<App>, name: string, email: string): Promise<string> {
  await request(app.getHttpServer()).post('/users').send({ name, email, password: 'senha-secreta' })

  const session = await request(app.getHttpServer()).post('/sessions').send({ email, password: 'senha-secreta' })

  return session.body.accessToken as string
}

describe('Contrato de erro da API (e2e)', () => {
  let app: INestApplication<App>
  let accessToken: string

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    const drizzle = app.get(DrizzleService)

    await drizzle.db.delete(assetGroups)
    await drizzle.db.delete(notes)
    await drizzle.db.delete(refreshTokens)
    await drizzle.db.delete(users)

    accessToken = await registerAndAuthenticate(app, 'Fulano de Tal', 'fulano@exemplo.com')
  })

  afterAll(async () => {
    await app.close()
  })

  it('responde erro de validação com 422 e a lista de campos', async () => {
    const response = await request(app.getHttpServer()).post('/notes').set('Authorization', `Bearer ${accessToken}`).send({ title: '', content: '' })

    expect(response.statusCode).toBe(422)
    expect(response.body).toEqual(
      expect.objectContaining({
        statusCode: 422,
        code: 'VALIDATION_FAILED',
        message: 'Falha na validação',
        path: '/notes',
        timestamp: expect.any(String) as string,
        requestId: expect.any(String) as string,
      }),
    )
    expect(response.body.details).toContainEqual(expect.objectContaining({ field: 'title', message: expect.any(String) as string }))
  })

  it('responde erro de regra de negócio com o código identificável', async () => {
    const response = await request(app.getHttpServer()).get(`/notes/${randomUUID()}`).set('Authorization', `Bearer ${accessToken}`)

    expect(response.statusCode).toBe(404)
    expect(response.body.code).toBe('RESOURCE_NOT_FOUND')
    expect(response.body.message).toBe('Nota não encontrada')
    expect(response.body.details).toBeUndefined()
  })

  it('responde 404 com o código identificável quando o registro é de outro usuário (RN010, RN011)', async () => {
    const otherUserAccessToken = await registerAndAuthenticate(app, 'Beltrano', 'beltrano@exemplo.com')

    const created = await request(app.getHttpServer())
      .post('/notes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Título', content: 'Conteúdo' })

    const response = await request(app.getHttpServer()).get(`/notes/${created.body.note.id}`).set('Authorization', `Bearer ${otherUserAccessToken}`)

    expect(response.statusCode).toBe(404)
    expect(response.body.code).toBe('RESOURCE_NOT_FOUND')
  })

  it('responde 401 com o código identificável quando a requisição não está autenticada (RNF005)', async () => {
    const response = await request(app.getHttpServer()).get(`/notes/${randomUUID()}`)

    expect(response.statusCode).toBe(401)
    expect(response.body.code).toBe('UNAUTHENTICATED')
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
      .set('Authorization', `Bearer ${accessToken}`)
      .set(RequestIdMiddleware.HEADER, 'correlation-e2e')

    expect(response.body.requestId).toBe('correlation-e2e')
    expect(response.headers[RequestIdMiddleware.HEADER]).toBe('correlation-e2e')
  })
})

describe('Contrato de erro inesperado da API (e2e)', () => {
  let app: INestApplication<App>
  let accessToken: string

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GetNoteUseCase)
      .useValue({ execute: () => Promise.reject(new Error('Connection terminated unexpectedly')) })
      .compile()

    app = moduleFixture.createNestApplication({ logger: false })
    await app.init()

    accessToken = await registerAndAuthenticate(app, 'Sicrano', 'sicrano@exemplo.com')
  })

  afterAll(async () => {
    await app.close()
  })

  it('responde 500 sem vazar a mensagem nem o stack trace', async () => {
    const response = await request(app.getHttpServer()).get(`/notes/${randomUUID()}`).set('Authorization', `Bearer ${accessToken}`)

    expect(response.statusCode).toBe(500)
    expect(response.body.code).toBe('INTERNAL_SERVER_ERROR')
    expect(response.body.message).toBe('Erro interno do servidor')
    expect(response.body.requestId).toEqual(expect.any(String))
    expect(JSON.stringify(response.body)).not.toContain('Connection terminated unexpectedly')
    expect(response.body.stack).toBeUndefined()
  })
})
