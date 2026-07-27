import { UniqueEntityID } from '@core/entities/unique-entity-id'

export interface DomainEvent {
  readonly occurredAt: Date

  getAggregateId(): UniqueEntityID
}
