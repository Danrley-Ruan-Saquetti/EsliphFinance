import { AggregateRoot } from '@core/entities/aggregate-root'
import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { InvariantError } from '@core/errors/invariant-error'
import { Optional } from '@core/types/optional'

const MILLISECONDS_IN_SECOND = 1000

export interface RefreshTokenProps {
  userId: UniqueEntityID
  tokenHash: string
  expiresAt: Date
  createdAt: Date
  revokedAt?: Date | null
}

export interface IssueRefreshTokenProps {
  userId: UniqueEntityID
  tokenHash: string
  expiresInSeconds: number
}

export class RefreshToken extends AggregateRoot<RefreshTokenProps> {
  static create(props: Optional<RefreshTokenProps, 'createdAt'>, id?: UniqueEntityID): RefreshToken {
    const createdAt = props.createdAt ?? new Date()

    RefreshToken.validateTokenHash(props.tokenHash)
    RefreshToken.validateExpiration(props.expiresAt, createdAt)

    return new RefreshToken({ ...props, createdAt }, id)
  }

  static issue({ userId, tokenHash, expiresInSeconds }: IssueRefreshTokenProps, id?: UniqueEntityID): RefreshToken {
    const createdAt = new Date()
    const expiresAt = new Date(createdAt.getTime() + expiresInSeconds * MILLISECONDS_IN_SECOND)

    return RefreshToken.create({ userId, tokenHash, expiresAt, createdAt }, id)
  }

  private static validateTokenHash(tokenHash: string): void {
    if (!tokenHash.trim()) {
      throw new InvariantError('O token de renovação não pode ser vazio')
    }
  }

  private static validateExpiration(expiresAt: Date, createdAt: Date): void {
    if (expiresAt.getTime() <= createdAt.getTime()) {
      throw new InvariantError('A expiração do token de renovação deve ser posterior à sua criação')
    }
  }

  get userId(): UniqueEntityID {
    return this.props.userId
  }

  get tokenHash(): string {
    return this.props.tokenHash
  }

  get expiresAt(): Date {
    return this.props.expiresAt
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get revokedAt(): Date | null | undefined {
    return this.props.revokedAt
  }

  get isRevoked(): boolean {
    return Boolean(this.props.revokedAt)
  }

  get isExpired(): boolean {
    return this.props.expiresAt.getTime() <= Date.now()
  }

  get isUsable(): boolean {
    return !this.isRevoked && !this.isExpired
  }

  revoke(): void {
    if (this.isRevoked) {
      return
    }

    this.props.revokedAt = new Date()
  }
}
