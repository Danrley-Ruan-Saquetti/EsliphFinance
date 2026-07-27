import { Module } from '@nestjs/common'

import { NotesRepository } from '@domain/example/application/repositories/notes-repository'
import { CreateNoteUseCase } from '@domain/example/application/use-cases/create-note'
import { GetNoteUseCase } from '@domain/example/application/use-cases/get-note'
import { DatabaseModule } from '@infra/database/database.module'
import { CreateNoteController } from '@infra/http/controllers/create-note.controller'
import { GetNoteController } from '@infra/http/controllers/get-note.controller'
import { HealthController } from '@infra/http/controllers/health.controller'

@Module({
  imports: [DatabaseModule],
  controllers: [HealthController, CreateNoteController, GetNoteController],
  providers: [
    {
      provide: CreateNoteUseCase,
      useFactory: (notesRepository: NotesRepository) => new CreateNoteUseCase(notesRepository),
      inject: [NotesRepository],
    },
    {
      provide: GetNoteUseCase,
      useFactory: (notesRepository: NotesRepository) => new GetNoteUseCase(notesRepository),
      inject: [NotesRepository],
    },
  ],
})
export class HttpModule {}
