import { Module } from '@nestjs/common'

import { NotesRepository } from '@domain/example/application/repositories/notes-repository'
import { InMemoryNotesRepository } from '@infra/database/in-memory/in-memory-notes-repository'

@Module({
  providers: [{ provide: NotesRepository, useClass: InMemoryNotesRepository }],
  exports: [NotesRepository],
})
export class DatabaseModule {}
