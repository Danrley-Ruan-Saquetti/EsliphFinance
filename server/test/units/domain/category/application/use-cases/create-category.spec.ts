import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { InvariantError } from '@core/errors/invariant-error'
import { CreateCategoryUseCase } from '@domain/category/application/use-cases/create-category'
import { CategoryNature } from '@domain/category/enterprise/value-objects/category-nature'
import { InMemoryCategoriesRepository } from '@infra/database/in-memory/in-memory-categories-repository'

let categoriesRepository: InMemoryCategoriesRepository
let sut: CreateCategoryUseCase

describe('Criar categoria', () => {
  beforeEach(() => {
    categoriesRepository = new InMemoryCategoriesRepository()
    sut = new CreateCategoryUseCase(categoriesRepository)
  })

  it('deve criar a categoria e persisti-la no repositório (RN029)', async () => {
    const result = await sut.execute({
      ownerId: new UniqueEntityID().toString(),
      name: 'Alimentação',
      nature: 'EXPENSE',
      icon: 'restaurant',
      color: '#E53935',
    })

    expect(result.isRight()).toBe(true)
    expect(categoriesRepository.items).toHaveLength(1)
    expect(categoriesRepository.items[0].name).toBe('Alimentação')
    expect(categoriesRepository.items[0].nature).toBe('EXPENSE')
    expect(categoriesRepository.items[0].icon).toBe('restaurant')
    expect(categoriesRepository.items[0].color).toBe('#E53935')
  })

  it('deve devolver a categoria criada', async () => {
    const result = await sut.execute({ ownerId: new UniqueEntityID().toString(), name: 'Salário', nature: 'INCOME', icon: 'cash', color: '#43A047' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.category.name).toBe('Salário')
      expect(result.value.category.nature).toBe('INCOME')
    }
  })

  it('deve criar a categoria com a natureza "Ambas" (RN030)', async () => {
    await sut.execute({ ownerId: new UniqueEntityID().toString(), name: 'Ajustes', nature: 'BOTH', icon: 'swap', color: '#43A047' })

    expect(categoriesRepository.items[0].nature).toBe('BOTH')
  })

  it('deve vincular a categoria ao usuário informado (RN010)', async () => {
    const ownerId = new UniqueEntityID().toString()

    await sut.execute({ ownerId, name: 'Alimentação', nature: 'EXPENSE', icon: 'restaurant', color: '#E53935' })

    expect(categoriesRepository.items[0].ownerId.toString()).toBe(ownerId)
  })

  it('deve lançar InvariantError quando o nome for vazio (RN029)', async () => {
    await expect(
      sut.execute({ ownerId: new UniqueEntityID().toString(), name: '   ', nature: 'EXPENSE', icon: 'restaurant', color: '#E53935' }),
    ).rejects.toThrow(InvariantError)

    expect(categoriesRepository.items).toHaveLength(0)
  })

  it('deve lançar InvariantError quando a natureza estiver fora do domínio permitido (RN030)', async () => {
    await expect(
      sut.execute({
        ownerId: new UniqueEntityID().toString(),
        name: 'Transferências',
        nature: 'TRANSFER' as CategoryNature,
        icon: 'swap',
        color: '#E53935',
      }),
    ).rejects.toThrow(InvariantError)

    expect(categoriesRepository.items).toHaveLength(0)
  })

  it('deve lançar InvariantError quando a cor estiver fora do formato hexadecimal #RRGGBB (RN029)', async () => {
    await expect(
      sut.execute({ ownerId: new UniqueEntityID().toString(), name: 'Alimentação', nature: 'EXPENSE', icon: 'restaurant', color: '#E39' }),
    ).rejects.toThrow(InvariantError)

    expect(categoriesRepository.items).toHaveLength(0)
  })
})
