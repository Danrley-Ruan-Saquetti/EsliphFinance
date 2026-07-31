import { Controller, Get, Param } from '@nestjs/common'
import { z } from 'zod'

import { GetNoteUseCase } from '@domain/example/application/use-cases/get-note'
import type { AuthenticatedUser } from '@infra/auth/authenticated-user'
import { CurrentUser } from '@infra/auth/current-user-decorator'
import { ZodValidationPipe } from '@infra/http/pipes/zod-validation-pipe'
import { NotePresenter } from '@infra/http/presenters/note-presenter'

const getNoteParamsSchema = z.object({ id: z.uuid() })

type GetNoteParams = z.infer<typeof getNoteParamsSchema>

@Controller('/notes')
export class GetNoteController {
  constructor(private readonly getNote: GetNoteUseCase) {}

  @Get('/:id')
  async handle(@CurrentUser() currentUser: AuthenticatedUser, @Param(new ZodValidationPipe(getNoteParamsSchema)) params: GetNoteParams) {
    const result = await this.getNote.execute({ noteId: params.id, ownerId: currentUser.id })

    if (result.isLeft()) {
      throw result.value
    }

    return { note: NotePresenter.toHTTP(result.value.note) }
  }
}
