# Contas

> **Contexto** `server/src/domain/account` · **Requisitos** RF004 · RN018–RN025, RN050

A _Conta_ é o contêiner de dinheiro do usuário. Ela existe em duas naturezas excludentes, decididas pelo **tipo do grupo** ao qual pertence e não por um campo próprio: conta de grupo "Padrão" tem saldo e não tem cartão; conta de grupo "Cartão de Crédito" não tem saldo e é controlada por limite (RN021, RN022). Essa bifurcação é a origem de quase toda a complexidade do contexto — inclusive de onde as validações moram.

## Mapa dos arquivos

| Artefato | Caminho (a partir de `server/`) | O que só ele sabe |
| -------- | ------------------------------- | ----------------- |
| `Account` (agregado) | `src/domain/account/enterprise/entities/account.ts` | Formato de nome, ícone e cor; recusa saldo inicial junto de cartão; `isArchived` derivado de `archivedAt`. `update(props)` reaplica as mesmas validações de `create` e troca nome, grupo, saldo inicial, ícone, cor e cartão de uma vez; `archive()` e `unarchive()` são reversíveis. Os três passam por `touch()`, que atualiza `updatedAt`. |
| `CreditCardSettings` (VO) | `src/domain/account/enterprise/value-objects/credit-card-settings.ts` | Mantém limite, dia de fechamento e dia de vencimento como um bloco só: os três existem juntos ou nenhum existe (RN019). Limite precisa ser maior que zero. |
| `BillingDay` (VO) | `src/domain/account/enterprise/value-objects/billing-day.ts` | Carrega a RN020 inteira: aceita 1 a 31 e `resolveForMonth(year, month)` ajusta para o último dia quando o mês não tem o dia configurado. Devolve data em UTC, para o dia não escorregar com fuso. |
| `AccountsRepository` (porta) | `src/domain/account/application/repositories/accounts-repository.ts` | `create`, `save`, `delete`, `findById` e `findManyByOwnerId(ownerId, filters)`. A listagem devolve `AccountWithBalance` — o saldo vem do repositório, não da entidade, porque é agregação. |
| `CreateAccountUseCase` | `src/domain/account/application/use-cases/create-account.ts` | Carrega o grupo antes de qualquer coisa e decide a compatibilidade tipo × campos. |
| `UpdateAccountUseCase` | `src/domain/account/application/use-cases/update-account.ts` | Carrega a conta (dono conferido) e o grupo atual dela; só então carrega o grupo de destino informado no corpo. Recusa a troca quando o tipo do grupo de destino diverge do tipo do grupo atual, e reaplica a mesma checagem tipo × campos do cartão que o `CreateAccountUseCase` usa. Saldo inicial e ícone omitidos no corpo mantêm o valor atual da conta — não voltam ao default de criação. |
| `ListAccountsUseCase` | `src/domain/account/application/use-cases/list-accounts.ts` | Separa saldo de limite disponível pelo `creditCard` da conta. Devolve `Either<never, ...>` — não tem caminho de erro. |
| `ArchiveAccountUseCase` | `src/domain/account/application/use-cases/archive-account.ts` | Carrega a conta pelo dono, chama `Account.archive()` e persiste com `save`. Conta alheia ou inexistente é `ResourceNotFoundError` (RN010, RN011). |
| `UnarchiveAccountUseCase` | `src/domain/account/application/use-cases/unarchive-account.ts` | Espelho do `ArchiveAccountUseCase`, chamando `Account.unarchive()`. |
| `DeleteAccountUseCase` | `src/domain/account/application/use-cases/delete-account.ts` | Só confere a propriedade do registro e exclui — **não** verifica vínculo com transações, porque o contexto de _Transações_ ainda não existe (ver "Ainda não existe"). |
| `InvalidAccountGroupTypeError` | `src/domain/account/application/use-cases/errors/invalid-account-group-type-error.ts` | `INVALID_ACCOUNT_GROUP_TYPE`, traduzido para **400**. Reaproveitado por `CreateAccountUseCase` e `UpdateAccountUseCase`. |
| Tabela `accounts` | `src/infra/database/drizzle/schemas/accounts.ts` | Colunas de cartão anuláveis; índices por dono e por grupo. |
| `DrizzleAccountMapper` | `src/infra/database/drizzle/mappers/drizzle-account-mapper.ts` | Monta o `CreditCardSettings` só quando as três colunas existem; qualquer uma nula devolve `null`. `toPersistence` serve tanto o `insert` de `create` quanto o `update` de `save`. |
| `DrizzleAccountsRepository` | `src/infra/database/drizzle/repositories/drizzle-accounts-repository.ts` | Todos os filtros em SQL; `innerJoin` com `account_groups` (é o que viabiliza filtrar por tipo); `leftJoin` com `transactions` + `groupBy(accounts.id)` para compor o **saldo** (RN021, RN050, SCRUM-55) — soma condicional (`sum(case when status = 'SETTLED' then ...)`) que já resolve o sinal por `type` (`INCOME` soma, `EXPENSE` subtrai, o resto — hoje só "TRANSFER" — não entra). O resultado do `sql` agregado chega como `string` (Postgres devolve `numeric`/`bigint` fora de coluna tipada como texto), por isso `toDomain` faz `Number(balanceInCents)` antes de `Money.fromCents`; ordena por nome; `save` é um `update` por id, `delete` é um `delete` por id. |
| `InMemoryAccountsRepository` | `src/infra/database/in-memory/in-memory-accounts-repository.ts` | **Recebe o `InMemoryAccountGroupsRepository` e o `InMemoryTransactionsRepository` no construtor**, os dois obrigatórios (SCRUM-55 tornou o segundo obrigatório para honrar a mesma porta do `DrizzleAccountsRepository` sem exceção — todo spec do contexto precisa montar os três repositórios, mesmo quando não testa saldo). `save` substitui o item pelo índice do `id`. |
| `CreateAccountController` | `src/infra/http/controllers/create-account.controller.ts` | Schema Zod do corpo, incluindo o formato da cor e o intervalo dos dias. |
| `UpdateAccountController` | `src/infra/http/controllers/update-account.controller.ts` | Mesmo schema Zod do corpo de `CreateAccountController`, mais o `id` da conta nos params. Devolve **200**, não 201. |
| `ListAccountsController` | `src/infra/http/controllers/list-accounts.controller.ts` | Schema Zod da query com os três filtros. |
| `ArchiveAccountController` | `src/infra/http/controllers/archive-account.controller.ts` | `PATCH /accounts/:id/archive`, devolve a conta no formato de `AccountPresenter.toHTTP`. |
| `UnarchiveAccountController` | `src/infra/http/controllers/unarchive-account.controller.ts` | `PATCH /accounts/:id/unarchive`, espelho do controller de arquivamento. |
| `DeleteAccountController` | `src/infra/http/controllers/delete-account.controller.ts` | `DELETE /accounts/:id`, responde 204 sem corpo. |
| `AccountPresenter` | `src/infra/http/presenters/account-presenter.ts` | `toHTTP` (cadastro e edição) e `toListHTTP` (listagem, com `balance` e `availableLimit`). |

## Regras que o código garante

| RN | Onde é aplicada | Como falha |
| -- | --------------- | ---------- |
| RN018 | `Account.create` / `Account.update` (nome, ícone, cor) + schema Zod de `CreateAccountController` e `UpdateAccountController` | Nome vazio ou acima de 120 caracteres, ícone fora do kebab-case ou cor fora de `#RRGGBB` → `InvariantError` (422). Na criação, saldo inicial omitido assume zero; na edição, omitido mantém o saldo atual. Negativo é aceito nos dois casos, porque saldo devedor é estado real. |
| RN019 | `CreateAccountUseCase` / `UpdateAccountUseCase` + `CreditCardSettings.create` | Grupo "Cartão de Crédito" sem `creditCard`, ou grupo "Padrão" com `creditCard` → `InvalidAccountGroupTypeError` (400). Limite ≤ 0 → `InvariantError` (422). Na edição, troca para um grupo de **tipo diferente** do grupo atual da conta também cai em `InvalidAccountGroupTypeError` (400), antes mesmo de olhar o corpo de `creditCard`. |
| RN020 | `BillingDay.create` e `BillingDay.resolveForMonth` + schema Zod da rota | Dia fora de 1–31 → 422. O intervalo é conferido nos dois lugares de propósito: o Zod faz o erro sair com `details[].field` apontando `creditCard.closingDay`; o VO garante quem chega pelo mapper ou por um caso de uso futuro. |
| RN021 | `DrizzleAccountsRepository.findManyByOwnerId` / `InMemoryAccountsRepository.calculateBalance` | Saldo = `initial_balance` + soma das _Transações_ "Efetivadas" da conta (RN050, SCRUM-55). Agregado na consulta, não em memória na entidade — é por isso que `AccountWithBalance.balance` vem do repositório. |
| RN050 | `DrizzleAccountsRepository.findManyByOwnerId` (`sum` condicional por `status`) / `InMemoryAccountsRepository.calculateBalance` (filtro por `status`) | Só [`Transaction`](transaction.md) com `status = 'SETTLED'` entra na soma; "Prevista" nunca afeta o `balance` devolvido. O **saldo projetado** (a metade "Previstas" da regra) não tem consulta própria ainda — ver "Ainda não existe". |
| RN022 | `Account.validateInitialBalance` e `ListAccountsUseCase` | Saldo inicial diferente de zero junto de `creditCard` → `InvariantError` (422). Na listagem, conta de cartão devolve `balance: null` — independente do que a agregação de RN021/RN050 calculou, porque `ListAccountsUseCase.toListedAccount` zera o saldo antes de responder quando a conta tem `creditCard`. |
| RN023 | `ListAccountsUseCase` | **Parcial.** O `availableLimit` é hoje o limite integral: a dedução das faturas em aberto e dos lançamentos não faturados depende do contexto de _Faturas_. |
| RN024 | `ArchiveAccountUseCase`, `DeleteAccountUseCase` | Arquivar é reversível via `UnarchiveAccountUseCase`. **Parcial na exclusão**: a conta é excluída sem checar vínculo com transações, porque o contexto de _Transações_ ainda não existe — ver "Ainda não existe". |
| RN025 | `Account.archivedAt` / `isArchived`, `ArchiveAccountUseCase`, `UnarchiveAccountUseCase` e o filtro `archived` de `ListAccountsUseCase` | Conta arquivada some da listagem quando `archived=false` é passado; segue visível quando o filtro é omitido, preservando o histórico. Também aplicada fora deste domínio, por [`CreateTransactionUseCase`](transaction.md) (`account.isArchived`), que rejeita a conta arquivada em novos lançamentos. |
| RN010, RN011 | `CreateAccountUseCase` (grupo do dono), `UpdateAccountUseCase` (conta e grupos do dono), `findManyByOwnerId`, `ArchiveAccountUseCase`, `UnarchiveAccountUseCase`, `DeleteAccountUseCase` | Grupo ou conta inexistente **ou de outro usuário** → `ResourceNotFoundError` (404), indistinguíveis de propósito. Na edição, conta inexistente ou de outro usuário responde o mesmo 404, antes mesmo de olhar o grupo. O `ownerId` nunca vem do cliente: sai do `@CurrentUser()`. |

## Fronteiras

| Domínio | Direção | Ponto de contato | O que rege |
| ------- | ------- | ---------------- | ---------- |
| [Grupos de Contas](account-group.md) | Conta → Grupo | `CreateAccountUseCase` injeta `AccountGroupsRepository` para ler o tipo; `Account.accountGroupId`; `FindManyAccountsFilters.accountGroupType` importa `AccountGroupType`; FK `accounts.account_group_id`; `innerJoin` na listagem | RN015, RN018, RN019 |
| [Usuários](user.md) | Conta → Usuário | `Account.ownerId`, vindo do token; FK `accounts.owner_id` | RN010, RN011 |
| [Transações](transaction.md) | Transação → Conta | `CreateTransactionUseCase` injeta `AccountsRepository` para checar dono e arquivamento antes de registrar o lançamento; `DrizzleAccountsRepository`/`InMemoryAccountsRepository` somam as _Transações_ "Efetivadas" no `balance` agregado da listagem (SCRUM-55) | RN010, RN011, RN021, RN025, RN050 |
| Faturas _(não existe)_ | Fatura → Conta | Vai deduzir do `availableLimit` | RN023, RN052 |

A dependência é de mão única: o contexto de Grupos de Contas não conhece `Account` no domínio. O `accountsCount` que ele expõe é contado na infraestrutura, por join — ver [Grupos de Contas](account-group.md).

## Persistência

Tabela `accounts`, criada pela migration `0005_create_accounts_table` e alterada por `0006_add_credit_card_settings_to_accounts` (as três colunas de cartão) e `0007_add_archived_at_to_accounts`.

| Coluna | Observação |
| ------ | ---------- |
| `owner_id`, `account_group_id` | FKs para `users` e `account_groups`, ambas indexadas |
| `initial_balance` | `moneyAmount` — `bigint` com `mode: 'number'`, inteiro em centavos (RNF004). Nunca `numeric` nem `real` |
| `color` | `char(7)`, guardada em maiúsculas |
| `credit_limit`, `closing_day`, `due_day` | Anuláveis e preenchidas juntas — é o contrato que o mapper assume nos dois sentidos |
| `archived_at` | Nulo significa ativa; o filtro `archived` vira `IS NULL` / `IS NOT NULL` |

## Contrato HTTP

| Rota | Controller | Caso de uso | Respostas |
| ---- | ---------- | ----------- | --------- |
| `POST /accounts` | `CreateAccountController` | `CreateAccountUseCase` | 201; 404 grupo inexistente ou alheio; 400 combinação tipo × campos; 422 validação e invariante |
| `PUT /accounts/:id` | `UpdateAccountController` | `UpdateAccountUseCase` | 200; 404 conta inexistente ou alheia, ou grupo de destino inexistente ou alheio; 400 troca de grupo de tipo diferente ou combinação tipo × campos; 422 validação e invariante. Corpo idêntico ao de `POST /accounts` — **sempre o estado final**, não um diff: `accountGroupId` e `color` são obrigatórios, `initialBalance` e `icon` omitidos mantêm o valor atual da conta |
| `GET /accounts` | `ListAccountsController` | `ListAccountsUseCase` | 200. Filtros opcionais e independentes: `accountGroupId`, `accountGroupType`, `archived`. **Omitir `archived` devolve arquivadas e ativas** |
| `PATCH /accounts/:id/archive` | `ArchiveAccountController` | `ArchiveAccountUseCase` | 200 com a conta arquivada; 404 conta inexistente ou alheia |
| `PATCH /accounts/:id/unarchive` | `UnarchiveAccountController` | `UnarchiveAccountUseCase` | 200 com a conta desarquivada; 404 conta inexistente ou alheia |
| `DELETE /accounts/:id` | `DeleteAccountController` | `DeleteAccountUseCase` | 204 sem corpo; 404 conta inexistente ou alheia |

Conta de grupo "Padrão" responde `balance` preenchido e `creditCard: null`; conta de cartão responde `balance: null` e `creditCard` com `availableLimit`. O shape é estável nos dois tipos — o cliente não precisa checar o tipo do grupo para ler a resposta.

## Ainda não existe

| Operação | RN | O que a destrava |
| -------- | -- | ---------------- |
| Consulta individual (`GET /accounts/:id`) | RN018 | Nada. A edição não precisou dela: `UpdateAccountUseCase` carrega a conta pelo `findById` já existente na porta, sem expor um endpoint de leitura própria |
| Exclusão bloqueada por transações vinculadas | RN024 | O contexto de _Transações_ já existe, mas `DeleteAccountUseCase` ainda não confere vínculo. Falta só ligar: o caso de uso ganha a mesma checagem de `DeleteCategoryUseCase.hasSubcategories`, mas perguntando ao `TransactionsRepository` por transações em vez de subcategorias — método que a porta também não tem ainda, porque hoje ela só expõe `create` |
| Saldo consolidado exclui contas arquivadas (RN077) | RN077 | Endpoint de saldo consolidado ainda não existe — nenhum código deste domínio contraria a regra, só não há o que a aplica |
| Saldo projetado (transações previstas) | RN050, RN079 | O saldo real (transações efetivadas) já existe desde a SCRUM-55. O projetado é reporte/painel — outro contexto, sem endpoint ainda |
| Limite disponível real | RN023 | Contexto de _Faturas_ |

## Onde tocar

**Campo novo na conta** → entidade (`Account`, com a invariante) → `schemas/accounts.ts` → gerar a migration → `DrizzleAccountMapper` nos dois sentidos → schema Zod do controller → `AccountPresenter` → `test/factories/make-account.ts` → specs.

**Operação nova** → caso de uso em `application/use-cases/` → método novo na porta `AccountsRepository`, se precisar → implementar nos **dois** repositórios (Drizzle e in-memory) → controller → registrar em `HttpModule` com `useFactory` + `inject` → presenter → spec unitário e e2e.

**Filtro novo na listagem** → `FindManyAccountsFilters` → `DrizzleAccountsRepository` (condição em SQL) → `InMemoryAccountsRepository` (mesmo comportamento) → schema Zod da query → `ListAccountsRequest`.

**Mexer no comportamento de cartão** → comece pelo `CreditCardSettings` e pelo `BillingDay`; a regra quase sempre é do VO. A checagem que depende do **tipo do grupo** é a exceção e mora no caso de uso, porque o tipo só se conhece depois de carregar o grupo do banco — não tente movê-la para o schema Zod.
