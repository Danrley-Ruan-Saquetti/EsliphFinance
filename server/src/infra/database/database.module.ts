import { Module } from '@nestjs/common'

import { NotesRepository } from '@domain/example/application/repositories/notes-repository'
import { UsersRepository } from '@domain/user/application/repositories/users-repository'
import { DrizzleService } from '@infra/database/drizzle/drizzle.service'
import { DrizzleNotesRepository } from '@infra/database/drizzle/repositories/drizzle-notes-repository'
import { DrizzleUsersRepository } from '@infra/database/drizzle/repositories/drizzle-users-repository'
import { EnvModule } from '@infra/env/env.module'

@Module({
  imports: [EnvModule],
  providers: [DrizzleService, { provide: NotesRepository, useClass: DrizzleNotesRepository }, { provide: UsersRepository, useClass: DrizzleUsersRepository }],
  exports: [DrizzleService, NotesRepository, UsersRepository],
})
export class DatabaseModule {}
