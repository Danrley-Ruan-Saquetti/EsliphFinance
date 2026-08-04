export const CATEGORY_NATURES = ['INCOME', 'EXPENSE', 'BOTH'] as const

export type CategoryNature = (typeof CATEGORY_NATURES)[number]
