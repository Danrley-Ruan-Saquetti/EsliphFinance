import { AggregateRoot } from '@core/entities/aggregate-root'
import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { InvariantError } from '@core/errors/invariant-error'
import { Optional } from '@core/types/optional'

export interface NoteProps {
  ownerId: UniqueEntityID
  title: string
  content: string
  createdAt: Date
  updatedAt?: Date | null
}

export class Note extends AggregateRoot<NoteProps> {
  static readonly TITLE_MAX_LENGTH = 120

  static create(props: Optional<NoteProps, 'createdAt'>, id?: UniqueEntityID): Note {
    const title = Note.validateTitle(props.title)

    return new Note({ ...props, title, createdAt: props.createdAt ?? new Date() }, id)
  }

  private static validateTitle(title: string): string {
    const normalized = title.trim()

    if (!normalized) {
      throw new InvariantError('O título da nota não pode ser vazio')
    }
    if (normalized.length > Note.TITLE_MAX_LENGTH) {
      throw new InvariantError(`O título da nota não pode ter mais de ${Note.TITLE_MAX_LENGTH} caracteres`)
    }

    return normalized
  }

  get ownerId(): UniqueEntityID {
    return this.props.ownerId
  }

  get title(): string {
    return this.props.title
  }

  get content(): string {
    return this.props.content
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date | null | undefined {
    return this.props.updatedAt
  }

  rename(title: string): void {
    this.props.title = Note.validateTitle(title)
    this.touch()
  }

  private touch(): void {
    this.props.updatedAt = new Date()
  }
}
