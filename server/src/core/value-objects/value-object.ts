export abstract class ValueObject<Props> {
  protected readonly props: Props

  protected constructor(props: Props) {
    this.props = props
  }

  equals(valueObject?: ValueObject<Props>): boolean {
    if (valueObject === null || valueObject === undefined) {
      return false
    }

    return JSON.stringify(this.props) === JSON.stringify(valueObject.props)
  }
}
