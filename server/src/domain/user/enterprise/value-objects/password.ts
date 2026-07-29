import { InvariantError } from '@core/errors/invariant-error'
import { ValueObject } from '@core/value-objects/value-object'

export interface PasswordProps {
  value: string
}

export class Password extends ValueObject<PasswordProps> {
  static readonly MIN_LENGTH = 8

  static create(value: string): Password {
    if (value.length < Password.MIN_LENGTH) {
      throw new InvariantError(`A senha deve ter no mínimo ${Password.MIN_LENGTH} caracteres`)
    }

    return new Password({ value })
  }

  get value(): string {
    return this.props.value
  }
}
