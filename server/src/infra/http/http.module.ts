import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'

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
import { CryptographyModule } from '@infra/cryptography/cryptography.module'
import { DatabaseModule } from '@infra/database/database.module'
import { EnvModule } from '@infra/env/env.module'
import { EnvService } from '@infra/env/env.service'
import { AuthenticateUserController } from '@infra/http/controllers/authenticate-user.controller'
import { CreateNoteController } from '@infra/http/controllers/create-note.controller'
import { CreateUserController } from '@infra/http/controllers/create-user.controller'
import { GetNoteController } from '@infra/http/controllers/get-note.controller'
import { HealthController } from '@infra/http/controllers/health.controller'
import { AllExceptionsFilter } from '@infra/http/filters/all-exceptions-filter'
import { CorsMiddleware } from '@infra/http/middlewares/cors-middleware'
import { HttpsRedirectMiddleware } from '@infra/http/middlewares/https-redirect-middleware'
import { RequestIdMiddleware } from '@infra/http/middlewares/request-id-middleware'
import { SecurityHeadersMiddleware } from '@infra/http/middlewares/security-headers-middleware'

@Module({
  imports: [DatabaseModule, CryptographyModule, EnvModule],
  controllers: [HealthController, CreateNoteController, GetNoteController, CreateUserController, AuthenticateUserController],
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
  ],
})
export class HttpModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorsMiddleware, SecurityHeadersMiddleware, RequestIdMiddleware, HttpsRedirectMiddleware).forRoutes('*')
  }
}
