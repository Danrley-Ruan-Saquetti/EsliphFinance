export const ASSET_GROUP_TYPES = ['DEFAULT', 'CREDIT_CARD'] as const

export type AssetGroupType = (typeof ASSET_GROUP_TYPES)[number]
