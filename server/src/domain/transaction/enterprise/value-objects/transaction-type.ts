export const TRANSACTION_TYPES = ['INCOME', 'EXPENSE', 'TRANSFER'] as const

export type TransactionType = (typeof TRANSACTION_TYPES)[number]
