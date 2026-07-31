import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'

import { AssetGroupsRepository } from '@domain/asset-group/application/repositories/asset-groups-repository'
import { CreateAssetGroupUseCase } from '@domain/asset-group/application/use-cases/create-asset-group'
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
import { CreateAssetGroupController } from '@infra/http/controllers/create-asset-group.controller'
import { CreateNoteController } from '@infra/http/controllers/create-note.controller'
import { CreateUserController } from '@infra/http/controllers/create-user.controller'
import { EndSessionController } from '@infra/http/controllers/end-session.controller'
import { GetNoteController } from '@infra/http/controllers/get-note.controller'
import { GetUserProfileController } from '@infra/http/controllers/get-user-profile.controller'
import { HealthController } from '@infra/http/controllers/health.controller'
import { RefreshSessionController } from '@infra/http/controllers/refresh-session.controller'
import { UpdateUserProfileController } from '@infra/http/controllers/update-user-profile.controller'
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
    CreateAssetGroupController,
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
      provide: CreateAssetGroupUseCase,
      useFactory: (assetGroupsRepository: AssetGroupsRepository) => new CreateAssetGroupUseCase(assetGroupsRepository),
      inject: [AssetGroupsRepository],
    },
  ],
})
export class HttpModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorsMiddleware, SecurityHeadersMiddleware, RequestIdMiddleware, HttpsRedirectMiddleware).forRoutes('*')
  }
}
