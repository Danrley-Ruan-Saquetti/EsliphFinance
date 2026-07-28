import { z } from 'zod'

export const ANY_ORIGIN = '*'

const ORIGIN_SEPARATOR = ','
const ONE_YEAR_IN_SECONDS = 31536000

function toOriginList(value: string): string[] {
  return value
    .split(ORIGIN_SEPARATOR)
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0)
}

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.url(),
    DATABASE_SSL: z
      .enum(['true', 'false'])
      .default('false')
      .transform(value => value === 'true'),
    DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
    CORS_ORIGINS: z.string().default(ANY_ORIGIN).transform(toOriginList),
    ENFORCE_HTTPS: z
      .enum(['true', 'false'])
      .optional()
      .transform(value => (value === undefined ? undefined : value === 'true')),
    HSTS_MAX_AGE: z.coerce.number().int().nonnegative().default(ONE_YEAR_IN_SECONDS),
  })
  .superRefine((env, context) => {
    if (env.NODE_ENV !== 'production') {
      return
    }

    if (env.ENFORCE_HTTPS === false) {
      context.addIssue({ code: 'custom', path: ['ENFORCE_HTTPS'], message: 'HTTPS cannot be disabled in production' })
    }

    if (env.CORS_ORIGINS.includes(ANY_ORIGIN)) {
      context.addIssue({ code: 'custom', path: ['CORS_ORIGINS'], message: 'Wildcard origin is not allowed in production' })
    }
  })
  .transform(env => ({ ...env, ENFORCE_HTTPS: env.ENFORCE_HTTPS ?? env.NODE_ENV === 'production' }))

export type Env = z.infer<typeof envSchema>
