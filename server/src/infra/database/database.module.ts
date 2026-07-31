import { Module } from '@nestjs/common'

import { AccountGroupsRepository } from '@domain/account-group/application/repositories/account-groups-repository'
import { NotesRepository } from '@domain/example/application/repositories/notes-repository'
import { RefreshTokensRepository } from '@domain/user/application/repositories/refresh-tokens-repository'
import { UsersRepository } from '@domain/user/application/repositories/users-repository'
import { DrizzleService } from '@infra/database/drizzle/drizzle.service'
import { DrizzleAccountGroupsRepository } from '@infra/database/drizzle/repositories/drizzle-account-groups-repository'
import { DrizzleNotesRepository } from '@infra/database/drizzle/repositories/drizzle-notes-repository'
import { DrizzleRefreshTokensRepository } from '@infra/database/drizzle/repositories/drizzle-refresh-tokens-repository'
import { DrizzleUsersRepository } from '@infra/database/drizzle/repositories/drizzle-users-repository'
import { EnvModule } from '@infra/env/env.module'

@Module({
  imports: [EnvModule],
  providers: [
    DrizzleService,
    { provide: NotesRepository, useClass: DrizzleNotesRepository },
    { provide: UsersRepository, useClass: DrizzleUsersRepository },
    { provide: RefreshTokensRepository, useClass: DrizzleRefreshTokensRepository },
    { provide: AccountGroupsRepository, useClass: DrizzleAccountGroupsRepository },
  ],
  exports: [DrizzleService, NotesRepository, UsersRepository, RefreshTokensRepository, AccountGroupsRepository],
})
export class DatabaseModule {}
