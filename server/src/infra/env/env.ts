import { z } from 'zod'

export const envSchema = z.object({
  DATABASE_URL: z.url(),
  DATABASE_SSL: z
    .enum(['true', 'false'])
    .default('false')
    .transform(value => value === 'true'),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  PORT: z.coerce.number().int().positive().default(3000),
})

export type Env = z.infer<typeof envSchema>
