import { beforeEach, describe, expect, it } from 'vitest'

import { AggregateRoot } from '@core/entities/aggregate-root'
import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { DomainEvent } from '@core/events/domain-event'

interface StubProps {
  value: string
}

class StubEvent implements DomainEvent {
  readonly occurredAt = new Date()

  constructor(private readonly aggregateId: UniqueEntityID) {}

  getAggregateId(): UniqueEntityID {
    return this.aggregateId
  }
}

class StubAggregate extends AggregateRoot<StubProps> {
  static create(props: StubProps, id?: UniqueEntityID): StubAggregate {
    return new StubAggregate(props, id)
  }

  register(event: DomainEvent): void {
    this.addDomainEvent(event)
  }
}

let sut: StubAggregate

describe('AggregateRoot', () => {
  beforeEach(() => {
    sut = StubAggregate.create({ value: 'valor' })
  })

  it('deve nascer sem eventos de domínio', () => {
    expect(sut.domainEvents).toHaveLength(0)
  })

  it('deve acumular os eventos de domínio registrados', () => {
    const event = new StubEvent(sut.id)

    sut.register(event)
    sut.register(new StubEvent(sut.id))

    expect(sut.domainEvents).toHaveLength(2)
    expect(sut.domainEvents[0]).toBe(event)
    expect(sut.domainEvents[0].getAggregateId().equals(sut.id)).toBe(true)
  })

  it('deve esvaziar os eventos de domínio ao limpá-los', () => {
    sut.register(new StubEvent(sut.id))

    sut.clearDomainEvents()

    expect(sut.domainEvents).toHaveLength(0)
  })
})
