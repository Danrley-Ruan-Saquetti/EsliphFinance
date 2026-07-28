import { describe, expect, it } from 'vitest'

import { NotePresenter } from '@infra/http/presenters/note-presenter'
import { makeNote } from '@tests/factories/make-note'

describe('NotePresenter', () => {
  it('deve expor a nota com o identificador em texto', () => {
    const note = makeNote()

    const result = NotePresenter.toHTTP(note)

    expect(result).toEqual({
      id: note.id.toString(),
      title: note.title,
      content: note.content,
      createdAt: note.createdAt,
      updatedAt: null,
    })
  })

  it('deve expor a data de atualização quando a nota já foi alterada', () => {
    const note = makeNote()

    note.rename('Outro título')

    expect(NotePresenter.toHTTP(note).updatedAt).toBe(note.updatedAt)
  })
})
