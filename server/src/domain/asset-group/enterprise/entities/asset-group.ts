import { AggregateRoot } from '@core/entities/aggregate-root'
import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { InvariantError } from '@core/errors/invariant-error'
import { Optional } from '@core/types/optional'
import { ASSET_GROUP_TYPES, AssetGroupType } from '@domain/asset-group/enterprise/value-objects/asset-group-type'

export interface AssetGroupProps {
  ownerId: UniqueEntityID
  name: string
  type: AssetGroupType
  createdAt: Date
  updatedAt?: Date | null
}

export class AssetGroup extends AggregateRoot<AssetGroupProps> {
  static readonly NAME_MAX_LENGTH = 120
  static readonly DEFAULT_TYPE: AssetGroupType = 'DEFAULT'

  static create(props: Optional<AssetGroupProps, 'createdAt' | 'type'>, id?: UniqueEntityID): AssetGroup {
    const name = AssetGroup.validateName(props.name)
    const type = AssetGroup.validateType(props.type ?? AssetGroup.DEFAULT_TYPE)

    return new AssetGroup({ ...props, name, type, createdAt: props.createdAt ?? new Date() }, id)
  }

  private static validateName(name: string): string {
    const normalized = name.trim()

    if (!normalized) {
      throw new InvariantError('O nome do grupo de ativo não pode ser vazio')
    }
    if (normalized.length > AssetGroup.NAME_MAX_LENGTH) {
      throw new InvariantError(`O nome do grupo de ativo não pode ter mais de ${AssetGroup.NAME_MAX_LENGTH} caracteres`)
    }

    return normalized
  }

  private static validateType(type: AssetGroupType): AssetGroupType {
    if (!ASSET_GROUP_TYPES.includes(type)) {
      throw new InvariantError('O tipo do grupo de ativo é inválido')
    }

    return type
  }

  get ownerId(): UniqueEntityID {
    return this.props.ownerId
  }

  get name(): string {
    return this.props.name
  }

  get type(): AssetGroupType {
    return this.props.type
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date | null | undefined {
    return this.props.updatedAt
  }
}
