import { Either, left, right } from '@core/either'
import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { UseCase } from '@core/use-case'
import { RefreshTokensRepository } from '@domain/user/application/repositories/refresh-tokens-repository'
import { AccessTokenGenerator } from '@domain/user/application/services/access-token-generator'
import { RefreshTokenGenerator } from '@domain/user/application/services/refresh-token-generator'
import { AuthenticatedSession } from '@domain/user/application/use-cases/authenticated-session'
import { InvalidRefreshTokenError } from '@domain/user/application/use-cases/errors/invalid-refresh-token-error'
import { RefreshToken } from '@domain/user/enterprise/entities/refresh-token'

export interface RefreshSessionRequest {
  refreshToken: string
}

export type RefreshSessionResponse = Either<InvalidRefreshTokenError, AuthenticatedSession>

export class RefreshSessionUseCase implements UseCase<RefreshSessionRequest, RefreshSessionResponse> {
  constructor(
    private readonly refreshTokensRepository: RefreshTokensRepository,
    private readonly accessTokenGenerator: AccessTokenGenerator,
    private readonly refreshTokenGenerator: RefreshTokenGenerator,
    private readonly refreshTokenExpiresInSeconds: number,
  ) {}

  async execute({ refreshToken }: RefreshSessionRequest): Promise<RefreshSessionResponse> {
    const storedRefreshToken = await this.refreshTokensRepository.findByTokenHash(this.refreshTokenGenerator.hash(refreshToken))

    if (!storedRefreshToken?.isUsable) {
      return left(new InvalidRefreshTokenError())
    }

    storedRefreshToken.revoke()

    await this.refreshTokensRepository.save(storedRefreshToken)

    const accessToken = await this.accessTokenGenerator.generate({ sub: storedRefreshToken.userId.toString() })
    const rotatedRefreshToken = await this.issueRefreshToken(storedRefreshToken.userId)

    return right({ accessToken, refreshToken: rotatedRefreshToken })
  }

  private async issueRefreshToken(userId: UniqueEntityID): Promise<string> {
    const token = this.refreshTokenGenerator.generate()
    const refreshToken = RefreshToken.issue({ userId, tokenHash: this.refreshTokenGenerator.hash(token), expiresInSeconds: this.refreshTokenExpiresInSeconds })

    await this.refreshTokensRepository.create(refreshToken)

    return token
  }
}
