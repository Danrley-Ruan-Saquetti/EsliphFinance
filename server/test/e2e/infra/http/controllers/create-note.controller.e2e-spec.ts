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

describe('Criar nota (e2e)', () => {
  let app: INestApplication<App>
  let accessToken: string

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

    accessToken = await registerAndAuthenticate('Fulano de Tal', 'fulano@exemplo.com')
  })

  afterAll(async () => {
    await app.close()
  })

  it('POST /notes cria a nota', async () => {
    const response = await request(app.getHttpServer())
      .post('/notes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Título', content: 'Conteúdo' })

    expect(response.statusCode).toBe(201)
    expect(response.body.note).toEqual(expect.objectContaining({ id: expect.any(String) as string, title: 'Título', content: 'Conteúdo' }))
  })

  it('POST /notes vincula a nota ao usuário autenticado (RN010)', async () => {
    const created = await request(app.getHttpServer())
      .post('/notes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Título', content: 'Conteúdo' })

    const response = await request(app.getHttpServer()).get(`/notes/${created.body.note.id}`).set('Authorization', `Bearer ${accessToken}`)

    expect(response.statusCode).toBe(200)
    expect(response.body.note.id).toBe(created.body.note.id)
  })

  it('POST /notes ignora o dono enviado pelo cliente e usa o do token (RN010, RN011)', async () => {
    const otherUserAccessToken = await registerAndAuthenticate('Beltrano', 'beltrano@exemplo.com')

    const created = await request(app.getHttpServer())
      .post('/notes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ownerId: randomUUID(), title: 'Título', content: 'Conteúdo' })

    const ownerResponse = await request(app.getHttpServer()).get(`/notes/${created.body.note.id}`).set('Authorization', `Bearer ${accessToken}`)
    const otherUserResponse = await request(app.getHttpServer()).get(`/notes/${created.body.note.id}`).set('Authorization', `Bearer ${otherUserAccessToken}`)

    expect(ownerResponse.statusCode).toBe(200)
    expect(otherUserResponse.statusCode).toBe(404)
  })

  it('POST /notes rejeita corpo inválido com 422', async () => {
    const response = await request(app.getHttpServer()).post('/notes').set('Authorization', `Bearer ${accessToken}`).send({ title: '', content: 'Conteúdo' })

    expect(response.statusCode).toBe(422)
    expect(response.body.code).toBe('VALIDATION_FAILED')
    expect(response.body.message).toBe('Falha na validação')
    expect(response.body.details.map((detail: { field: string }) => detail.field)).toEqual(['title'])
  })

  it('POST /notes rejeita requisição sem token de acesso com 401', async () => {
    const response = await request(app.getHttpServer()).post('/notes').send({ title: 'Título', content: 'Conteúdo' })

    expect(response.statusCode).toBe(401)
    expect(response.body.code).toBe('UNAUTHENTICATED')
  })
})
