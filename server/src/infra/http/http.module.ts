import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'

import { AccountGroupsRepository } from '@domain/account-group/application/repositories/account-groups-repository'
import { CreateAccountGroupUseCase } from '@domain/account-group/application/use-cases/create-account-group'
import { GetAccountGroupUseCase } from '@domain/account-group/application/use-cases/get-account-group'
import { ListAccountGroupsUseCase } from '@domain/account-group/application/use-cases/list-account-groups'
import { AccountsRepository } from '@domain/account/application/repositories/accounts-repository'
import { CreateAccountUseCase } from '@domain/account/application/use-cases/create-account'
import { ListAccountsUseCase } from '@domain/account/application/use-cases/list-accounts'
import { CategoriesRepository } from '@domain/category/application/repositories/categories-repository'
import { ArchiveCategoryUseCase } from '@domain/category/application/use-cases/archive-category'
import { CreateCategoryUseCase } from '@domain/category/application/use-cases/create-category'
import { DeleteCategoryUseCase } from '@domain/category/application/use-cases/delete-category'
import { ListCategoryTreeUseCase } from '@domain/category/application/use-cases/list-category-tree'
import { UnarchiveCategoryUseCase } from '@domain/category/application/use-cases/unarchive-category'
import { NotesRepository } from '@domain/example/application/repositories/notes-repository'
import { CreateNoteUseCase } from '@domain/example/application/use-cases/create-note'
import { GetNoteUseCase } from '@domain/example/application/use-cases/get-note'
import { RefreshTokensRepository } from '@domain/user/application/repositories/refresh-tokens-repository'
import { UsersRepository } from '@domain/user/application/repositories/users-repository'
import { AccessTokenGenerator } from '@domain/user/application/services/access-token-generator'
import { HashComparer } from '@domain/user/application/services/hash-comparer'
import { HashGenerator } from '@domain/user/application/services/hash-generator'
import { RefreshTokenGenerator } from '@domain/user/application/services/refresh-token-generator'
import { AuthenticateUserUseCase } from '@domain/user/application/use-cases/authenticate-user'
import { CreateUserUseCase } from '@domain/user/application/use-cases/create-user'
import { EndSessionUseCase } from '@domain/user/application/use-cases/end-session'
import { GetUserProfileUseCase } from '@domain/user/application/use-cases/get-user-profile'
import { RefreshSessionUseCase } from '@domain/user/application/use-cases/refresh-session'
import { UpdateUserProfileUseCase } from '@domain/user/application/use-cases/update-user-profile'
import { AuthModule } from '@infra/auth/auth.module'
import { CryptographyModule } from '@infra/cryptography/cryptography.module'
import { DatabaseModule } from '@infra/database/database.module'
import { EnvModule } from '@infra/env/env.module'
import { EnvService } from '@infra/env/env.service'
import { AuthenticateUserController } from '@infra/http/controllers/authenticate-user.controller'
import { CreateAccountGroupController } from '@infra/http/controllers/create-account-group.controller'
import { CreateAccountController } from '@infra/http/controllers/create-account.controller'
import { CreateCategoryController } from '@infra/http/controllers/create-category.controller'
import { CreateNoteController } from '@infra/http/controllers/create-note.controller'
import { CreateUserController } from '@infra/http/controllers/create-user.controller'
import { EndSessionController } from '@infra/http/controllers/end-session.controller'
import { GetAccountGroupController } from '@infra/http/controllers/get-account-group.controller'
import { GetNoteController } from '@infra/http/controllers/get-note.controller'
import { GetUserProfileController } from '@infra/http/controllers/get-user-profile.controller'
import { HealthController } from '@infra/http/controllers/health.controller'
import { ListAccountGroupsController } from '@infra/http/controllers/list-account-groups.controller'
import { ListAccountsController } from '@infra/http/controllers/list-accounts.controller'
import { RefreshSessionController } from '@infra/http/controllers/refresh-session.controller'
import { UpdateUserProfileController } from '@infra/http/controllers/update-user-profile.controller'
import { ArchiveCategoryController } from '@infra/http/controllers/archive-category.controller'
import { DeleteCategoryController } from '@infra/http/controllers/delete-category.controller'
import { ListCategoryTreeController } from '@infra/http/controllers/list-category-tree.controller'
import { UnarchiveCategoryController } from '@infra/http/controllers/unarchive-category.controller'
import { AllExceptionsFilter } from '@infra/http/filters/all-exceptions-filter'
import { CorsMiddleware } from '@infra/http/middlewares/cors-middleware'
import { HttpsRedirectMiddleware } from '@infra/http/middlewares/https-redirect-middleware'
import { RequestIdMiddleware } from '@infra/http/middlewares/request-id-middleware'
import { SecurityHeadersMiddleware } from '@infra/http/middlewares/security-headers-middleware'

@Module({
  imports: [DatabaseModule, CryptographyModule, EnvModule, AuthModule],
  controllers: [
    HealthController,
    CreateNoteController,
    GetNoteController,
    CreateUserController,
    GetUserProfileController,
    UpdateUserProfileController,
    AuthenticateUserController,
    RefreshSessionController,
    EndSessionController,
    CreateAccountGroupController,
    ListAccountGroupsController,
    GetAccountGroupController,
    CreateAccountController,
    ListAccountsController,
    CreateCategoryController,
    ArchiveCategoryController,
    UnarchiveCategoryController,
    DeleteCategoryController,
    ListCategoryTreeController,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
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
    {
      provide: CreateUserUseCase,
      useFactory: (usersRepository: UsersRepository, hashGenerator: HashGenerator) => new CreateUserUseCase(usersRepository, hashGenerator),
      inject: [UsersRepository, HashGenerator],
    },
    {
      provide: GetUserProfileUseCase,
      useFactory: (usersRepository: UsersRepository) => new GetUserProfileUseCase(usersRepository),
      inject: [UsersRepository],
    },
    {
      provide: UpdateUserProfileUseCase,
      useFactory: (usersRepository: UsersRepository) => new UpdateUserProfileUseCase(usersRepository),
      inject: [UsersRepository],
    },
    {
      provide: AuthenticateUserUseCase,
      useFactory: (
        usersRepository: UsersRepository,
        refreshTokensRepository: RefreshTokensRepository,
        hashComparer: HashComparer,
        accessTokenGenerator: AccessTokenGenerator,
        refreshTokenGenerator: RefreshTokenGenerator,
        envService: EnvService,
      ) =>
        new AuthenticateUserUseCase(
          usersRepository,
          refreshTokensRepository,
          hashComparer,
          accessTokenGenerator,
          refreshTokenGenerator,
          envService.get('REFRESH_TOKEN_EXPIRES_IN_SECONDS'),
        ),
      inject: [UsersRepository, RefreshTokensRepository, HashComparer, AccessTokenGenerator, RefreshTokenGenerator, EnvService],
    },
    {
      provide: RefreshSessionUseCase,
      useFactory: (
        refreshTokensRepository: RefreshTokensRepository,
        accessTokenGenerator: AccessTokenGenerator,
        refreshTokenGenerator: RefreshTokenGenerator,
        envService: EnvService,
      ) => new RefreshSessionUseCase(refreshTokensRepository, accessTokenGenerator, refreshTokenGenerator, envService.get('REFRESH_TOKEN_EXPIRES_IN_SECONDS')),
      inject: [RefreshTokensRepository, AccessTokenGenerator, RefreshTokenGenerator, EnvService],
    },
    {
      provide: EndSessionUseCase,
      useFactory: (refreshTokensRepository: RefreshTokensRepository, refreshTokenGenerator: RefreshTokenGenerator) =>
        new EndSessionUseCase(refreshTokensRepository, refreshTokenGenerator),
      inject: [RefreshTokensRepository, RefreshTokenGenerator],
    },
    {
      provide: CreateAccountGroupUseCase,
      useFactory: (accountGroupsRepository: AccountGroupsRepository) => new CreateAccountGroupUseCase(accountGroupsRepository),
      inject: [AccountGroupsRepository],
    },
    {
      provide: ListAccountGroupsUseCase,
      useFactory: (accountGroupsRepository: AccountGroupsRepository) => new ListAccountGroupsUseCase(accountGroupsRepository),
      inject: [AccountGroupsRepository],
    },
    {
      provide: GetAccountGroupUseCase,
      useFactory: (accountGroupsRepository: AccountGroupsRepository) => new GetAccountGroupUseCase(accountGroupsRepository),
      inject: [AccountGroupsRepository],
    },
    {
      provide: CreateAccountUseCase,
      useFactory: (accountsRepository: AccountsRepository, accountGroupsRepository: AccountGroupsRepository) =>
        new CreateAccountUseCase(accountsRepository, accountGroupsRepository),
      inject: [AccountsRepository, AccountGroupsRepository],
    },
    {
      provide: ListAccountsUseCase,
      useFactory: (accountsRepository: AccountsRepository) => new ListAccountsUseCase(accountsRepository),
      inject: [AccountsRepository],
    },
    {
      provide: CreateCategoryUseCase,
      useFactory: (categoriesRepository: CategoriesRepository) => new CreateCategoryUseCase(categoriesRepository),
      inject: [CategoriesRepository],
    },
    {
      provide: ArchiveCategoryUseCase,
      useFactory: (categoriesRepository: CategoriesRepository) => new ArchiveCategoryUseCase(categoriesRepository),
      inject: [CategoriesRepository],
    },
    {
      provide: UnarchiveCategoryUseCase,
      useFactory: (categoriesRepository: CategoriesRepository) => new UnarchiveCategoryUseCase(categoriesRepository),
      inject: [CategoriesRepository],
    },
    {
      provide: DeleteCategoryUseCase,
      useFactory: (categoriesRepository: CategoriesRepository) => new DeleteCategoryUseCase(categoriesRepository),
      inject: [CategoriesRepository],
    },
    {
      provide: ListCategoryTreeUseCase,
      useFactory: (categoriesRepository: CategoriesRepository) => new ListCategoryTreeUseCase(categoriesRepository),
      inject: [CategoriesRepository],
    },
  ],
})
export class HttpModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorsMiddleware, SecurityHeadersMiddleware, RequestIdMiddleware, HttpsRedirectMiddleware).forRoutes('*')
  }
}
