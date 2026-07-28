import { describe, expect, it } from 'vitest'

import { envSchema } from '@infra/env/env'

describe('envSchema', () => {
  const databaseUrl = 'postgresql://postgres:postgres@database:5432/esliph_finance'

  it('deve aplicar os padrões de desenvolvimento quando só a URL do banco é informada', () => {
    const env = envSchema.parse({ DATABASE_URL: databaseUrl })

    expect(env).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      DATABASE_URL: databaseUrl,
      DATABASE_SSL: false,
      DATABASE_POOL_MAX: 10,
      CORS_ORIGINS: ['*'],
      ENFORCE_HTTPS: false,
      HSTS_MAX_AGE: 31536000,
    })
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

  it('deve rejeitar um ambiente desconhecido', () => {
    expect(() => envSchema.parse({ DATABASE_URL: databaseUrl, NODE_ENV: 'homologação' })).toThrow()
  })

  it('deve separar as origens do CORS em lista, ignorando espaços e itens vazios', () => {
    const env = envSchema.parse({ DATABASE_URL: databaseUrl, CORS_ORIGINS: ' https://app.esliph.com , https://admin.esliph.com ,' })

    expect(env.CORS_ORIGINS).toEqual(['https://app.esliph.com', 'https://admin.esliph.com'])
  })

  it('deve exigir HTTPS por padrão em produção (RNF007)', () => {
    const env = envSchema.parse({ DATABASE_URL: databaseUrl, NODE_ENV: 'production', CORS_ORIGINS: 'https://app.esliph.com' })

    expect(env.ENFORCE_HTTPS).toBe(true)
  })

  it('deve rejeitar HTTPS desabilitado em produção (RNF007)', () => {
    const parsing = () => envSchema.parse({ DATABASE_URL: databaseUrl, NODE_ENV: 'production', CORS_ORIGINS: 'https://app.esliph.com', ENFORCE_HTTPS: 'false' })

    expect(parsing).toThrow(/HTTPS cannot be disabled in production/)
  })

  it('deve rejeitar a origem coringa do CORS em produção', () => {
    const parsing = () => envSchema.parse({ DATABASE_URL: databaseUrl, NODE_ENV: 'production' })

    expect(parsing).toThrow(/Wildcard origin is not allowed in production/)
  })

  it('deve permitir habilitar HTTPS fora de produção', () => {
    const env = envSchema.parse({ DATABASE_URL: databaseUrl, ENFORCE_HTTPS: 'true' })

    expect(env.ENFORCE_HTTPS).toBe(true)
  })

  it('deve rejeitar uma duração negativa do Strict-Transport-Security', () => {
    expect(() => envSchema.parse({ DATABASE_URL: databaseUrl, HSTS_MAX_AGE: '-1' })).toThrow()
  })
})
