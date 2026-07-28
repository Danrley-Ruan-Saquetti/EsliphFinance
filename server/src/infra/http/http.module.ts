import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'

import { NotesRepository } from '@domain/example/application/repositories/notes-repository'
import { CreateNoteUseCase } from '@domain/example/application/use-cases/create-note'
import { GetNoteUseCase } from '@domain/example/application/use-cases/get-note'
import { DatabaseModule } from '@infra/database/database.module'
import { CreateNoteController } from '@infra/http/controllers/create-note.controller'
import { GetNoteController } from '@infra/http/controllers/get-note.controller'
import { HealthController } from '@infra/http/controllers/health.controller'
import { AllExceptionsFilter } from '@infra/http/filters/all-exceptions-filter'
import { RequestIdMiddleware } from '@infra/http/middlewares/request-id-middleware'

@Module({
  imports: [DatabaseModule],
  controllers: [HealthController, CreateNoteController, GetNoteController],
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
  ],
})
export class HttpModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*')
  }
}
