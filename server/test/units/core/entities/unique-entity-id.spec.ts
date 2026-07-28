import { describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'

describe('UniqueEntityID', () => {
  it('deve gerar um identificador quando nenhum valor é informado', () => {
    const sut = new UniqueEntityID()

    expect(sut.toString()).toBeTruthy()
    expect(sut.toString()).not.toBe(new UniqueEntityID().toString())
  })

  it('deve preservar o valor informado', () => {
    const sut = new UniqueEntityID('7f6b6a1e-0d5c-4f2b-9c3a-1e2d3c4b5a69')

    expect(sut.toString()).toBe('7f6b6a1e-0d5c-4f2b-9c3a-1e2d3c4b5a69')
    expect(sut.toValue()).toBe('7f6b6a1e-0d5c-4f2b-9c3a-1e2d3c4b5a69')
  })

  it('deve considerar iguais dois identificadores com o mesmo valor', () => {
    const sut = new UniqueEntityID('7f6b6a1e-0d5c-4f2b-9c3a-1e2d3c4b5a69')

    expect(sut.equals(new UniqueEntityID('7f6b6a1e-0d5c-4f2b-9c3a-1e2d3c4b5a69'))).toBe(true)
  })

  it('deve considerar diferentes dois identificadores com valores distintos', () => {
    const sut = new UniqueEntityID()

    expect(sut.equals(new UniqueEntityID())).toBe(false)
  })
})
