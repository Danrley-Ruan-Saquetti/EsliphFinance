import { z } from 'zod'

import { Money } from '@core/value-objects/money'

export const moneySchema = z.int('O valor deve ser um número inteiro em centavos').transform(amountInCents => Money.fromCents(amountInCents))
