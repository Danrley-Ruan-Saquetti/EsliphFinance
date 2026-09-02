import { describe, expect, it } from 'vitest'

import { InvariantError } from '@core/errors/invariant-error'
import { Money } from '@core/value-objects/money'

describe('Money', () => {
  it('deve criar o valor a partir de centavos inteiros (RNF-0004)', () => {
    const sut = Money.fromCents(1234)

    expect(sut.amountInCents).toBe(1234)
  })

  it('deve criar o valor zero', () => {
    expect(Money.zero().amountInCents).toBe(0)
  })

  it('deve aceitar valor negativo em centavos', () => {
    expect(Money.fromCents(-1234).amountInCents).toBe(-1234)
  })

  it('deve lançar ao criar o valor a partir de um número fracionário (RNF-0004)', () => {
    expect(() => Money.fromCents(10.5)).toThrow(InvariantError)
  })

  it('deve lançar ao criar o valor a partir de um número fora do inteiro seguro', () => {
    expect(() => Money.fromCents(Number.MAX_SAFE_INTEGER + 1)).toThrow(InvariantError)
    expect(() => Money.fromCents(Number.POSITIVE_INFINITY)).toThrow(InvariantError)
    expect(() => Money.fromCents(Number.NaN)).toThrow(InvariantError)
  })

  it('deve considerar iguais dois valores com a mesma quantidade de centavos', () => {
    const sut = Money.fromCents(1000)

    expect(sut.equals(Money.fromCents(1000))).toBe(true)
    expect(sut.equals(Money.fromCents(1001))).toBe(false)
  })

  it('deve somar dois valores sem alterar os originais', () => {
    const sut = Money.fromCents(1050)
    const other = Money.fromCents(2575)

    const result = sut.add(other)

    expect(result.amountInCents).toBe(3625)
    expect(sut.amountInCents).toBe(1050)
    expect(other.amountInCents).toBe(2575)
  })

  it('deve subtrair dois valores resultando em valor negativo quando o minuendo é menor', () => {
    const result = Money.fromCents(1000).subtract(Money.fromCents(2575))

    expect(result.amountInCents).toBe(-1575)
  })

  it('deve lançar ao somar valores que estouram o inteiro seguro', () => {
    const sut = Money.fromCents(Number.MAX_SAFE_INTEGER)

    expect(() => sut.add(Money.fromCents(1))).toThrow(InvariantError)
  })

  it('deve multiplicar por um fator inteiro', () => {
    expect(Money.fromCents(1050).multiply(3).amountInCents).toBe(3150)
  })

  it('deve arredondar a multiplicação para o centavo mais próximo', () => {
    expect(Money.fromCents(1000).multiply(0.1234).amountInCents).toBe(123)
    expect(Money.fromCents(1000).multiply(0.1235).amountInCents).toBe(124)
  })

  it('deve arredondar a multiplicação afastando-se do zero no meio do centavo', () => {
    expect(Money.fromCents(333).multiply(0.5).amountInCents).toBe(167)
    expect(Money.fromCents(-333).multiply(0.5).amountInCents).toBe(-167)
  })

  it('deve zerar o valor ao multiplicar por zero', () => {
    expect(Money.fromCents(1050).multiply(0).amountInCents).toBe(0)
  })

  it('deve lançar ao multiplicar por um fator que não produz um valor representável', () => {
    const sut = Money.fromCents(1000)

    expect(() => sut.multiply(Number.NaN)).toThrow(InvariantError)
    expect(() => sut.multiply(Number.POSITIVE_INFINITY)).toThrow(InvariantError)
  })

  it('deve dividir o valor em partes iguais quando a divisão é exata', () => {
    const parts = Money.fromCents(9000).allocate(3)

    expect(parts.map(part => part.amountInCents)).toEqual([3000, 3000, 3000])
  })

  it('deve aplicar a diferença de arredondamento na primeira parte (RN-0065)', () => {
    const parts = Money.fromCents(10000).allocate(3)

    expect(parts.map(part => part.amountInCents)).toEqual([3334, 3333, 3333])
  })

  it('deve preservar o total ao dividir em partes (RN-0065, RNF-0004)', () => {
    const total = Money.fromCents(10000)

    const parts = total.allocate(7)

    expect(parts.reduce((sum, part) => sum.add(part), Money.zero()).amountInCents).toBe(total.amountInCents)
  })

  it('deve preservar o total ao dividir um valor negativo em partes (RN-0065)', () => {
    const total = Money.fromCents(-10000)

    const parts = total.allocate(3)

    expect(parts.map(part => part.amountInCents)).toEqual([-3334, -3333, -3333])
    expect(parts.reduce((sum, part) => sum.add(part), Money.zero()).amountInCents).toBe(total.amountInCents)
  })

  it('deve devolver o valor inteiro quando dividido em uma única parte', () => {
    const parts = Money.fromCents(10000).allocate(1)

    expect(parts.map(part => part.amountInCents)).toEqual([10000])
  })

  it('deve dividir um valor menor que a quantidade de partes concentrando os centavos na primeira (RN-0065)', () => {
    const parts = Money.fromCents(2).allocate(3)

    expect(parts.map(part => part.amountInCents)).toEqual([2, 0, 0])
  })

  it('deve lançar ao dividir em uma quantidade de partes inválida', () => {
    const sut = Money.fromCents(10000)

    expect(() => sut.allocate(0)).toThrow(InvariantError)
    expect(() => sut.allocate(-1)).toThrow(InvariantError)
    expect(() => sut.allocate(2.5)).toThrow(InvariantError)
  })

  it('deve formatar o valor com duas casas decimais (RNF-0004)', () => {
    expect(Money.fromCents(123456).toString()).toBe('1234.56')
    expect(Money.fromCents(1000).toString()).toBe('10.00')
    expect(Money.fromCents(5).toString()).toBe('0.05')
    expect(Money.zero().toString()).toBe('0.00')
  })

  it('deve formatar o valor negativo com o sinal antes da parte inteira (RNF-0004)', () => {
    expect(Money.fromCents(-1234).toString()).toBe('-12.34')
    expect(Money.fromCents(-5).toString()).toBe('-0.05')
  })

  it('deve formatar o maior valor representável sem perder precisão (RNF-0004)', () => {
    expect(Money.fromCents(Number.MAX_SAFE_INTEGER).toString()).toBe('90071992547409.91')
  })
})
