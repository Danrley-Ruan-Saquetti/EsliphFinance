import { describe, expect, it } from 'vitest'

import { Either, left, right } from '@core/either'

function doSomething(shouldSucceed: boolean): Either<string, number> {
  return shouldSucceed ? right(10) : left('error')
}

describe('Either', () => {
  it('deve retornar o valor de sucesso em um Right', () => {
    const result = doSomething(true)

    expect(result.isRight()).toBe(true)
    expect(result.isLeft()).toBe(false)
    if (result.isRight()) {
      expect(result.value).toBe(10)
    }
  })

  it('deve retornar o erro em um Left', () => {
    const result = doSomething(false)

    expect(result.isLeft()).toBe(true)
    expect(result.isRight()).toBe(false)
    if (result.isLeft()) {
      expect(result.value).toBe('error')
    }
  })
})
