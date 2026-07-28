import { describe, expect, it } from 'vitest'

import { Entity } from '@core/entities/entity'
import { UniqueEntityID } from '@core/entities/unique-entity-id'

interface StubProps {
  value: string
}

class StubEntity extends Entity<StubProps> {
  static create(props: StubProps, id?: UniqueEntityID): StubEntity {
    return new StubEntity(props, id)
  }
}

describe('Entity', () => {
  it('deve gerar um identificador quando nenhum é informado', () => {
    const sut = StubEntity.create({ value: 'valor' })

    expect(sut.id).toBeInstanceOf(UniqueEntityID)
    expect(sut.id.toString()).toBeTruthy()
  })

  it('deve preservar o identificador informado', () => {
    const id = new UniqueEntityID()

    const sut = StubEntity.create({ value: 'valor' }, id)

    expect(sut.id.equals(id)).toBe(true)
  })

  it('deve considerar igual a si mesma', () => {
    const sut = StubEntity.create({ value: 'valor' })

    expect(sut.equals(sut)).toBe(true)
  })

  it('deve considerar iguais duas entidades com o mesmo identificador', () => {
    const id = new UniqueEntityID()

    const sut = StubEntity.create({ value: 'valor' }, id)

    expect(sut.equals(StubEntity.create({ value: 'outro valor' }, id))).toBe(true)
  })

  it('deve considerar diferentes duas entidades com identificadores distintos', () => {
    const sut = StubEntity.create({ value: 'valor' })

    expect(sut.equals(StubEntity.create({ value: 'valor' }))).toBe(false)
  })
})
