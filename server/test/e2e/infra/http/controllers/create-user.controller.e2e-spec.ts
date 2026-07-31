import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '@app.module'
import { DrizzleService } from '@infra/database/drizzle/drizzle.service'
import { assetGroups } from '@infra/database/drizzle/schemas/asset-groups'
import { refreshTokens } from '@infra/database/drizzle/schemas/refresh-tokens'
import { users } from '@infra/database/drizzle/schemas/users'

describe('Cadastrar usuário (e2e)', () => {
  let app: INestApplication<App>

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    const drizzle = app.get(DrizzleService)

    await drizzle.db.delete(assetGroups)
    await drizzle.db.delete(refreshTokens)
    await drizzle.db.delete(users)
  })

  afterAll(async () => {
    await app.close()
  })

  it('POST /users cria o usuário sem expor o hash da senha', async () => {
    const response = await request(app.getHttpServer()).post('/users').send({ name: 'Fulano de Tal', email: 'fulano@exemplo.com', password: 'senha-secreta' })

    expect(response.statusCode).toBe(201)
    expect(response.body.user).toEqual(expect.objectContaining({ id: expect.any(String) as string, name: 'Fulano de Tal', email: 'fulano@exemplo.com' }))
    expect(response.text).not.toContain('senha-secreta')
    expect(response.body.user.passwordHash).toBeUndefined()
  })

  it('POST /users rejeita corpo inválido com 422', async () => {
    const response = await request(app.getHttpServer()).post('/users').send({ name: '', email: 'não-é-email', password: 'curta' })

    expect(response.statusCode).toBe(422)
    expect(response.body.code).toBe('VALIDATION_FAILED')
    expect(response.body.details.map((detail: { field: string }) => detail.field)).toEqual(['name', 'email', 'password'])
  })

  it('POST /users rejeita e-mail já cadastrado com 409 (RN002)', async () => {
    await request(app.getHttpServer()).post('/users').send({ name: 'Beltrano', email: 'beltrano@exemplo.com', password: 'senha-secreta' })

    const response = await request(app.getHttpServer()).post('/users').send({ name: 'Outro Beltrano', email: 'beltrano@exemplo.com', password: 'outra-senha' })

    expect(response.statusCode).toBe(409)
    expect(response.body.code).toBe('EMAIL_ALREADY_IN_USE')
  })
})
