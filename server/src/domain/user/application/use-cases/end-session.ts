import { Either, left, right } from '@core/either'
import { NotAllowedError } from '@core/errors/not-allowed-error'
import { UseCase } from '@core/use-case'
import { RefreshTokensRepository } from '@domain/user/application/repositories/refresh-tokens-repository'
import { RefreshTokenGenerator } from '@domain/user/application/services/refresh-token-generator'
import { RefreshToken } from '@domain/user/enterprise/entities/refresh-token'

export interface EndSessionRequest {
  userId: string
  refreshToken: string
}

export type EndSessionResponse = Either<NotAllowedError, null>

export class EndSessionUseCase implements UseCase<EndSessionRequest, EndSessionResponse> {
  constructor(
    private readonly refreshTokensRepository: RefreshTokensRepository,
    private readonly refreshTokenGenerator: RefreshTokenGenerator,
  ) {}

  async execute({ userId, refreshToken }: EndSessionRequest): Promise<EndSessionResponse> {
    const storedRefreshToken = await this.refreshTokensRepository.findByTokenHash(this.refreshTokenGenerator.hash(refreshToken))

    if (!storedRefreshToken) {
      return right(null)
    }

    if (!this.isOwnedBy(storedRefreshToken, userId)) {
      return left(new NotAllowedError('Este token de renovação pertence a outro usuário'))
    }

    if (storedRefreshToken.isRevoked) {
      return right(null)
    }

    storedRefreshToken.revoke()

    await this.refreshTokensRepository.save(storedRefreshToken)

    return right(null)
  }

  private isOwnedBy(refreshToken: RefreshToken, userId: string): boolean {
    return refreshToken.userId.toString() === userId
  }
}
