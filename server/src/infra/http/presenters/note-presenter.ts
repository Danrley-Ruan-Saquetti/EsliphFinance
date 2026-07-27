import { Note } from '@domain/example/enterprise/entities/note'

export class NotePresenter {
  static toHTTP(note: Note) {
    return {
      id: note.id.toString(),
      title: note.title,
      content: note.content,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt ?? null,
    }
  }
}
