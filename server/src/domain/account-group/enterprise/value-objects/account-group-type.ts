export const ACCOUNT_GROUP_TYPES = ['DEFAULT', 'CREDIT_CARD'] as const

export type AccountGroupType = (typeof ACCOUNT_GROUP_TYPES)[number]
