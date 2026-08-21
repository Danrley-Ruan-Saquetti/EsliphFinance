import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'

import { HealthController } from '@infra/http/controllers/health.controller'
import { AllExceptionsFilter } from '@infra/http/filters/all-exceptions-filter'
import { CorsMiddleware } from '@infra/http/middlewares/cors-middleware'
import { HttpsRedirectMiddleware } from '@infra/http/middlewares/https-redirect-middleware'
import { RequestIdMiddleware } from '@infra/http/middlewares/request-id-middleware'
import { SecurityHeadersMiddleware } from '@infra/http/middlewares/security-headers-middleware'

@Module({
  controllers: [HealthController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class HttpModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorsMiddleware, SecurityHeadersMiddleware, RequestIdMiddleware, HttpsRedirectMiddleware).forRoutes('*')
  }
}
