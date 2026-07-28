import { Env } from '@infra/env/env'
import { EnvService } from '@infra/env/env.service'
import { makeEnv } from '@tests/factories/make-env'

export function makeEnvService(override: Partial<Env> = {}): EnvService {
  const env = makeEnv(override)

  return { get: <Key extends keyof Env>(key: Key): Env[Key] => env[key] } as EnvService
}
