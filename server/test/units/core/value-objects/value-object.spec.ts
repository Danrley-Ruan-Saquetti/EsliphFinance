import { describe, expect, it } from 'vitest'

import { ValueObject } from '@core/value-objects/value-object'

interface StubProps {
  amount: number
}

class StubValueObject extends ValueObject<StubProps> {
  static create(props: StubProps): StubValueObject {
    return new StubValueObject(props)
  }
}

describe('ValueObject', () => {
  it('deve considerar iguais dois objetos de valor com as mesmas propriedades', () => {
    const sut = StubValueObject.create({ amount: 1000 })

    expect(sut.equals(StubValueObject.create({ amount: 1000 }))).toBe(true)
  })

  it('deve considerar diferentes dois objetos de valor com propriedades distintas', () => {
    const sut = StubValueObject.create({ amount: 1000 })

    expect(sut.equals(StubValueObject.create({ amount: 1001 }))).toBe(false)
  })

  it('deve considerar diferente quando comparado com indefinido', () => {
    const sut = StubValueObject.create({ amount: 1000 })

    expect(sut.equals(undefined)).toBe(false)
  })

  it('deve considerar diferente quando comparado com nulo', () => {
    const sut = StubValueObject.create({ amount: 1000 })

    expect(sut.equals(null as unknown as ValueObject<StubProps>)).toBe(false)
  })
})
