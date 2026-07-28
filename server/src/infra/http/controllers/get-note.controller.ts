import { Controller, Get, Param, Query } from '@nestjs/common'
import { z } from 'zod'

import { GetNoteUseCase } from '@domain/example/application/use-cases/get-note'
import { ZodValidationPipe } from '@infra/http/pipes/zod-validation-pipe'
import { NotePresenter } from '@infra/http/presenters/note-presenter'

const getNoteParamsSchema = z.object({ id: z.uuid() })
const getNoteQuerySchema = z.object({ ownerId: z.uuid() })

type GetNoteParams = z.infer<typeof getNoteParamsSchema>
type GetNoteQuery = z.infer<typeof getNoteQuerySchema>

@Controller('/notes')
export class GetNoteController {
  constructor(private readonly getNote: GetNoteUseCase) {}

  @Get('/:id')
  async handle(
    @Param(new ZodValidationPipe(getNoteParamsSchema)) params: GetNoteParams,
    @Query(new ZodValidationPipe(getNoteQuerySchema)) query: GetNoteQuery,
  ) {
    const result = await this.getNote.execute({ noteId: params.id, ownerId: query.ownerId })

    if (result.isLeft()) {
      throw result.value
    }

    return { note: NotePresenter.toHTTP(result.value.note) }
  }
}
