import { Module } from '@nestjs/common'

import { AccountGroupsRepository } from '@domain/account-group/application/repositories/account-groups-repository'
import { AccountsRepository } from '@domain/account/application/repositories/accounts-repository'
import { CategoriesRepository } from '@domain/category/application/repositories/categories-repository'
import { NotesRepository } from '@domain/example/application/repositories/notes-repository'
import { RefreshTokensRepository } from '@domain/user/application/repositories/refresh-tokens-repository'
import { UsersRepository } from '@domain/user/application/repositories/users-repository'
import { DrizzleService } from '@infra/database/drizzle/drizzle.service'
import { DrizzleAccountGroupsRepository } from '@infra/database/drizzle/repositories/drizzle-account-groups-repository'
import { DrizzleAccountsRepository } from '@infra/database/drizzle/repositories/drizzle-accounts-repository'
import { DrizzleCategoriesRepository } from '@infra/database/drizzle/repositories/drizzle-categories-repository'
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
    { provide: AccountsRepository, useClass: DrizzleAccountsRepository },
    { provide: CategoriesRepository, useClass: DrizzleCategoriesRepository },
  ],
  exports: [DrizzleService, NotesRepository, UsersRepository, RefreshTokensRepository, AccountGroupsRepository, AccountsRepository, CategoriesRepository],
})
export class DatabaseModule {}
