import { ConfigService } from '@nestjs/config'
import { beforeEach, describe, expect, it } from 'vitest'

import { Env } from '@infra/env/env'
import { EnvService } from '@infra/env/env.service'
import { makeEnv } from '@tests/factories/make-env'

const env = makeEnv({ NODE_ENV: 'development' })

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
    expect(sut.get('NODE_ENV')).toBe('development')
    expect(sut.get('CORS_ORIGINS')).toEqual(['*'])
    expect(sut.get('ENFORCE_HTTPS')).toBe(false)
    expect(sut.get('HSTS_MAX_AGE')).toBe(31536000)
  })

  it('deve consultar a configuração pela mesma chave solicitada', () => {
    sut.get('PORT')

    expect(requestedKeys).toEqual(['PORT'])
  })
})
