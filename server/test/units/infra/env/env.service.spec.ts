import { ConfigService } from '@nestjs/config'
import { beforeEach, describe, expect, it } from 'vitest'

import { Env } from '@infra/env/env'
import { EnvService } from '@infra/env/env.service'

const env: Env = {
  DATABASE_URL: 'postgresql://postgres:postgres@database:5432/esliph_finance',
  DATABASE_SSL: false,
  DATABASE_POOL_MAX: 10,
  PORT: 3000,
}

let requestedKeys: (keyof Env)[]
let sut: EnvService

describe('EnvService', () => {
  beforeEach(() => {
    requestedKeys = []

    const configService = {
      get: <Key extends keyof Env>(key: Key): Env[Key] => {
        requestedKeys.push(key)

        return env[key]
      },
    } as unknown as ConfigService<Env, true>

    sut = new EnvService(configService)
  })

  it('deve devolver o valor da variável de ambiente pela chave', () => {
    expect(sut.get('DATABASE_URL')).toBe(env.DATABASE_URL)
    expect(sut.get('PORT')).toBe(env.PORT)
    expect(sut.get('DATABASE_SSL')).toBe(false)
    expect(sut.get('DATABASE_POOL_MAX')).toBe(10)
  })

  it('deve consultar a configuração pela mesma chave solicitada', () => {
    sut.get('PORT')

    expect(requestedKeys).toEqual(['PORT'])
  })
})
