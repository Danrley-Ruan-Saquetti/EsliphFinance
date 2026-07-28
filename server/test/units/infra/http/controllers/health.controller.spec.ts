import { describe, expect, it } from 'vitest'

import { HealthController } from '@infra/http/controllers/health.controller'

describe('HealthController', () => {
  it('deve responder que a aplicação está no ar', () => {
    const sut = new HealthController()

    expect(sut.status()).toEqual({ status: true })
  })
})
