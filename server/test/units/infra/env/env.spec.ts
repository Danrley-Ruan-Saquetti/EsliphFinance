import { describe, expect, it } from 'vitest'

import { envSchema } from '@infra/env/env'

describe('envSchema', () => {
  const databaseUrl = 'postgresql://postgres:postgres@database:5432/esliph_finance'

  it('deve aplicar os padrões de desenvolvimento quando só a URL do banco é informada', () => {
    const env = envSchema.parse({ DATABASE_URL: databaseUrl })

    expect(env).toEqual({ DATABASE_URL: databaseUrl, DATABASE_SSL: false, DATABASE_POOL_MAX: 10, PORT: 3000 })
  })

  it('deve rejeitar a configuração quando a URL do banco está ausente (RNF003)', () => {
    expect(() => envSchema.parse({})).toThrow()
  })

  it('deve rejeitar a configuração quando a URL do banco é inválida', () => {
    expect(() => envSchema.parse({ DATABASE_URL: 'não-é-uma-url' })).toThrow()
  })

  it('deve converter DATABASE_SSL em booleano para conectar em instância na nuvem (RNF003)', () => {
    const env = envSchema.parse({ DATABASE_URL: databaseUrl, DATABASE_SSL: 'true' })

    expect(env.DATABASE_SSL).toBe(true)
  })

  it('deve converter a porta e o tamanho do pool em número', () => {
    const env = envSchema.parse({ DATABASE_URL: databaseUrl, DATABASE_POOL_MAX: '25', PORT: '4000' })

    expect(env.DATABASE_POOL_MAX).toBe(25)
    expect(env.PORT).toBe(4000)
  })

  it('deve rejeitar um tamanho de pool não positivo', () => {
    expect(() => envSchema.parse({ DATABASE_URL: databaseUrl, DATABASE_POOL_MAX: '0' })).toThrow()
  })
})
