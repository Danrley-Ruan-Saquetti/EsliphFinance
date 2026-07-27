import { Entity } from '@core/entities/entity'
import { DomainEvent } from '@core/events/domain-event'

export abstract class AggregateRoot<Props> extends Entity<Props> {
  private _domainEvents: DomainEvent[] = []

  get domainEvents(): readonly DomainEvent[] {
    return this._domainEvents
  }

  protected addDomainEvent(domainEvent: DomainEvent): void {
    this._domainEvents.push(domainEvent)
  }

  clearDomainEvents(): void {
    this._domainEvents = []
  }
}
