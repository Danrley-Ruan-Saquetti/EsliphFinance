import { describe, expect, it } from 'vitest'

import { validateEnv } from '@infra/env/validate-env'

describe('validateEnv', () => {
  const databaseUrl = 'postgresql://postgres:postgres@database:5432/esliph_finance'

  it('deve devolver a configuração já validada e transformada', () => {
    const env = validateEnv({ DATABASE_URL: databaseUrl, PORT: '4000' })

    expect(env.DATABASE_URL).toBe(databaseUrl)
    expect(env.PORT).toBe(4000)
  })

  it('deve falhar apontando a variável obrigatória ausente', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL is required/)
  })

  it('deve falhar descrevendo o motivo quando a variável tem valor inválido', () => {
    const validation = () => validateEnv({ DATABASE_URL: 'não-é-uma-url' })

    expect(validation).toThrow(/Invalid environment variables:/)
    expect(validation).not.toThrow(/DATABASE_URL is required/)
  })

  it('deve reunir todas as variáveis inválidas em uma única mensagem', () => {
    const validation = () => validateEnv({ PORT: 'porta' })

    expect(validation).toThrow(/DATABASE_URL is required/)
    expect(validation).toThrow(/PORT:/)
  })

  it('deve falhar quando a política de transporte de produção não é atendida (RNF007)', () => {
    const validation = () => validateEnv({ DATABASE_URL: databaseUrl, NODE_ENV: 'production', ENFORCE_HTTPS: 'false' })

    expect(validation).toThrow(/ENFORCE_HTTPS:/)
    expect(validation).toThrow(/CORS_ORIGINS:/)
  })
})
