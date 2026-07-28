import { Module } from '@nestjs/common'

import { NotesRepository } from '@domain/example/application/repositories/notes-repository'
import { DrizzleService } from '@infra/database/drizzle/drizzle.service'
import { DrizzleNotesRepository } from '@infra/database/drizzle/repositories/drizzle-notes-repository'
import { EnvModule } from '@infra/env/env.module'

@Module({
  imports: [EnvModule],
  providers: [DrizzleService, { provide: NotesRepository, useClass: DrizzleNotesRepository }],
  exports: [DrizzleService, NotesRepository],
})
export class DatabaseModule {}
