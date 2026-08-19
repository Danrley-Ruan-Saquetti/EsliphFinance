export const TRANSACTION_STATUSES = ['PLANNED', 'SETTLED'] as const

export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number]
