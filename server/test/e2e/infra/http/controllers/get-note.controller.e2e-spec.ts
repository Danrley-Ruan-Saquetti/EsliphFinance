import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { App } from 'supertest/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '@app.module'
import { DrizzleService } from '@infra/database/drizzle/drizzle.service'
import { assetGroups } from '@infra/database/drizzle/schemas/asset-groups'
import { notes } from '@infra/database/drizzle/schemas/notes'
import { refreshTokens } from '@infra/database/drizzle/schemas/refresh-tokens'
import { users } from '@infra/database/drizzle/schemas/users'

describe('Consultar nota (e2e)', () => {
  let app: INestApplication<App>
  let ownerAccessToken: string
  let otherUserAccessToken: string
  let noteId: string

  async function registerAndAuthenticate(name: string, email: string): Promise<string> {
    await request(app.getHttpServer()).post('/users').send({ name, email, password: 'senha-secreta' })

    const session = await request(app.getHttpServer()).post('/sessions').send({ email, password: 'senha-secreta' })

    return session.body.accessToken as string
  }

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

    ownerAccessToken = await registerAndAuthenticate('Fulano de Tal', 'fulano@exemplo.com')
    otherUserAccessToken = await registerAndAuthenticate('Beltrano', 'beltrano@exemplo.com')

    const created = await request(app.getHttpServer())
      .post('/notes')
      .set('Authorization', `Bearer ${ownerAccessToken}`)
      .send({ title: 'Título', content: 'Conteúdo' })

    noteId = created.body.note.id as string
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /notes/:id retorna a nota do próprio dono', async () => {
    const response = await request(app.getHttpServer()).get(`/notes/${noteId}`).set('Authorization', `Bearer ${ownerAccessToken}`)

    expect(response.statusCode).toBe(200)
    expect(response.body.note.id).toBe(noteId)
  })

  it('GET /notes/:id responde 404 para nota inexistente', async () => {
    const response = await request(app.getHttpServer()).get(`/notes/${randomUUID()}`).set('Authorization', `Bearer ${ownerAccessToken}`)

    expect(response.statusCode).toBe(404)
  })

  it('GET /notes/:id responde 404 para nota de outro usuário (RN010, RN011)', async () => {
    const response = await request(app.getHttpServer()).get(`/notes/${noteId}`).set('Authorization', `Bearer ${otherUserAccessToken}`)

    expect(response.statusCode).toBe(404)
    expect(response.body.code).toBe('RESOURCE_NOT_FOUND')
  })

  it('GET /notes/:id não distingue nota de outro usuário de nota inexistente (RN011)', async () => {
    const crossAccess = await request(app.getHttpServer()).get(`/notes/${noteId}`).set('Authorization', `Bearer ${otherUserAccessToken}`)
    const missingNote = await request(app.getHttpServer()).get(`/notes/${randomUUID()}`).set('Authorization', `Bearer ${otherUserAccessToken}`)

    expect(crossAccess.statusCode).toBe(missingNote.statusCode)
    expect(crossAccess.body.code).toBe(missingNote.body.code)
    expect(crossAccess.body.message).toBe(missingNote.body.message)
  })

  it('GET /notes/:id rejeita requisição sem token de acesso com 401', async () => {
    const response = await request(app.getHttpServer()).get(`/notes/${noteId}`)

    expect(response.statusCode).toBe(401)
    expect(response.body.code).toBe('UNAUTHENTICATED')
  })
})
