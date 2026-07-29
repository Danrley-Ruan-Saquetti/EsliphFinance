import { ANY_ORIGIN, Env } from '@infra/env/env'

const DEFAULT_DATABASE_URL = 'postgresql://postgres:postgres@database:5432/esliph_finance'

export function makeEnv(override: Partial<Env> = {}): Env {
  return {
    NODE_ENV: 'test',
    PORT: 3000,
    DATABASE_URL: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
    DATABASE_SSL: false,
    DATABASE_POOL_MAX: 10,
    CORS_ORIGINS: [ANY_ORIGIN],
    ENFORCE_HTTPS: false,
    HSTS_MAX_AGE: 31536000,
    JWT_SECRET: 'esliph-finance-development-secret-key',
    ACCESS_TOKEN_EXPIRES_IN_SECONDS: 900,
    REFRESH_TOKEN_EXPIRES_IN_SECONDS: 2592000,
    ...override,
  }
}
