import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '@app.module'
import { cleanDatabase } from '@tests/database/clean-database'

interface Session {
  accessToken: string
  refreshToken: string
}

describe('Encerrar sessão (e2e)', () => {
  let app: INestApplication<App>

  async function authenticate(email = 'fulano@exemplo.com'): Promise<Session> {
    const response = await request(app.getHttpServer()).post('/sessions').send({ email, password: 'senha-secreta' })

    return response.body as Session
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    await cleanDatabase(app)

    await request(app.getHttpServer()).post('/users').send({ name: 'Fulano de Tal', email: 'fulano@exemplo.com', password: 'senha-secreta' })
    await request(app.getHttpServer()).post('/users').send({ name: 'Beltrano', email: 'beltrano@exemplo.com', password: 'senha-secreta' })
  })

  afterAll(async () => {
    await app.close()
  })

  it('POST /sessions/logout invalida o token de renovação da sessão informada', async () => {
    const session = await authenticate()

    const response = await request(app.getHttpServer())
      .post('/sessions/logout')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ refreshToken: session.refreshToken })

    expect(response.statusCode).toBe(204)

    const refreshResponse = await request(app.getHttpServer()).post('/sessions/refresh').send({ refreshToken: session.refreshToken })

    expect(refreshResponse.statusCode).toBe(401)
    expect(refreshResponse.body.code).toBe('INVALID_REFRESH_TOKEN')
  })

  it('POST /sessions/logout mantém as demais sessões do usuário válidas', async () => {
    const session = await authenticate()
    const otherSession = await authenticate()

    await request(app.getHttpServer())
      .post('/sessions/logout')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ refreshToken: session.refreshToken })

    const refreshResponse = await request(app.getHttpServer()).post('/sessions/refresh').send({ refreshToken: otherSession.refreshToken })

    expect(refreshResponse.statusCode).toBe(200)
  })

  it('POST /sessions/logout responde 204 quando o token de renovação já foi invalidado', async () => {
    const session = await authenticate()

    await request(app.getHttpServer())
      .post('/sessions/logout')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ refreshToken: session.refreshToken })

    const response = await request(app.getHttpServer())
      .post('/sessions/logout')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ refreshToken: session.refreshToken })

    expect(response.statusCode).toBe(204)
  })

  it('POST /sessions/logout responde 204 quando o token de renovação não existe', async () => {
    const session = await authenticate()

    const response = await request(app.getHttpServer())
      .post('/sessions/logout')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ refreshToken: 'token-inexistente' })

    expect(response.statusCode).toBe(204)
  })

  it('POST /sessions/logout ignora o token de renovação de outro usuário, mantendo-o válido (RN010, RN011)', async () => {
    const session = await authenticate()
    const otherUserSession = await authenticate('beltrano@exemplo.com')

    const response = await request(app.getHttpServer())
      .post('/sessions/logout')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ refreshToken: otherUserSession.refreshToken })

    expect(response.statusCode).toBe(204)

    const refreshResponse = await request(app.getHttpServer()).post('/sessions/refresh').send({ refreshToken: otherUserSession.refreshToken })

    expect(refreshResponse.statusCode).toBe(200)
  })

  it('POST /sessions/logout rejeita corpo inválido com 422', async () => {
    const session = await authenticate()

    const response = await request(app.getHttpServer())
      .post('/sessions/logout')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ refreshToken: '' })

    expect(response.statusCode).toBe(422)
    expect(response.body.code).toBe('VALIDATION_FAILED')
    expect(response.body.details.map((detail: { field: string }) => detail.field)).toEqual(['refreshToken'])
  })

  it('POST /sessions/logout rejeita requisição sem token de acesso com 401', async () => {
    const session = await authenticate()

    const response = await request(app.getHttpServer()).post('/sessions/logout').send({ refreshToken: session.refreshToken })

    expect(response.statusCode).toBe(401)
    expect(response.body.code).toBe('UNAUTHENTICATED')
  })
})
