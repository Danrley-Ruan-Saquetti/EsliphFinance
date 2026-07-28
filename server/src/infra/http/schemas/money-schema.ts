import { z } from 'zod'

import { Money } from '@core/value-objects/money'

export const moneySchema = z.int('Amount must be an integer in cents').transform(amountInCents => Money.fromCents(amountInCents))
