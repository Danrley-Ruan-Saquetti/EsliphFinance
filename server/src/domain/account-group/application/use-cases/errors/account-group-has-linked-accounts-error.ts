import { BaseError } from '@core/errors/base-error'

export class AccountGroupHasLinkedAccountsError extends BaseError {
  readonly code = 'ACCOUNT_GROUP_HAS_LINKED_ACCOUNTS'

  constructor(accountsCount: number) {
    super(AccountGroupHasLinkedAccountsError.buildMessage(accountsCount))
  }

  private static buildMessage(accountsCount: number): string {
    const noun = accountsCount === 1 ? 'conta vinculada' : 'contas vinculadas'

    return `Este grupo possui ${accountsCount} ${noun} e não pode ser excluído`
  }
}
