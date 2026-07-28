import { BadRequestException, Controller, ForbiddenException, Get, NotFoundException, Param, Query } from '@nestjs/common'
import { z } from 'zod'

import { BaseError } from '@core/errors/base-error'
import { NotAllowedError } from '@core/errors/not-allowed-error'
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error'
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
      const error: BaseError = result.value

      if (error instanceof ResourceNotFoundError) {
        throw new NotFoundException(error.message)
      }
      if (error instanceof NotAllowedError) {
        throw new ForbiddenException(error.message)
      }

      throw new BadRequestException(error.message)
    }

    return { note: NotePresenter.toHTTP(result.value.note) }
  }
}
