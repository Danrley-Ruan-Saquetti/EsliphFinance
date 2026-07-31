import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { z } from 'zod'

import { CreateNoteUseCase } from '@domain/example/application/use-cases/create-note'
import type { AuthenticatedUser } from '@infra/auth/authenticated-user'
import { CurrentUser } from '@infra/auth/current-user-decorator'
import { ZodValidationPipe } from '@infra/http/pipes/zod-validation-pipe'
import { NotePresenter } from '@infra/http/presenters/note-presenter'

const createNoteBodySchema = z.object({
  title: z.string().min(1).max(120),
  content: z.string().min(1),
})

type CreateNoteBody = z.infer<typeof createNoteBodySchema>

@Controller('/notes')
export class CreateNoteController {
  constructor(private readonly createNote: CreateNoteUseCase) {}

  @Post()
  @HttpCode(201)
  async handle(@CurrentUser() currentUser: AuthenticatedUser, @Body(new ZodValidationPipe(createNoteBodySchema)) body: CreateNoteBody) {
    const result = await this.createNote.execute({ ...body, ownerId: currentUser.id })

    return { note: NotePresenter.toHTTP(result.value.note) }
  }
}
