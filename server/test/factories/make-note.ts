import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { Note, NoteProps } from '@domain/example/enterprise/entities/note'

export function makeNote(override: Partial<NoteProps> = {}, id?: UniqueEntityID): Note {
  return Note.create({ ownerId: new UniqueEntityID(), title: 'Título', content: 'Conteúdo', ...override }, id)
}
