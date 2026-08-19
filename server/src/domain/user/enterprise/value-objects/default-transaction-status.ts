export const DEFAULT_TRANSACTION_STATUSES = ['PLANNED', 'SETTLED'] as const

export type DefaultTransactionStatus = (typeof DEFAULT_TRANSACTION_STATUSES)[number]
