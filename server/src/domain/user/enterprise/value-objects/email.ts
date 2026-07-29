import { InvariantError } from '@core/errors/invariant-error'
import { ValueObject } from '@core/value-objects/value-object'

export interface EmailProps {
  value: string
}

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export class Email extends ValueObject<EmailProps> {
  static readonly MAX_LENGTH = 254

  static create(value: string): Email {
    const normalized = value.trim().toLowerCase()

    if (!EMAIL_FORMAT.test(normalized)) {
      throw new InvariantError('O e-mail informado é inválido')
    }
    if (normalized.length > Email.MAX_LENGTH) {
      throw new InvariantError(`O e-mail não pode ter mais de ${Email.MAX_LENGTH} caracteres`)
    }

    return new Email({ value: normalized })
  }

  get value(): string {
    return this.props.value
  }

  toString(): string {
    return this.props.value
  }
}
