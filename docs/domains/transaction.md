# Transações

> **Contexto** `server/src/domain/transaction` · **Requisitos** RF008 · RN039–RN043, RN048, RN049

A _Transação_ é o lançamento financeiro do usuário: uma despesa, uma receita ou (modelada, mas não operante ainda) uma transferência entre contas. É o primeiro contexto que referencia dois outros ao mesmo tempo — _Conta_ e _Categoria_ — e por isso concentra as checagens de propriedade e de compatibilidade que cada um deles já antecipava em "Ainda não existe". Com a SCRUM-54 ele passa a referenciar também _Usuário_ para ler a preferência de situação padrão (ver "Fronteiras").

Hoje o contexto só tem o registro (SCRUM-52) de receita e despesa. Transferência (RN043–RN047) está fora de escopo desta história — ver "Ainda não existe". A **situação** (RN048) pode ser informada explicitamente no corpo do `POST /transactions` ou omitida, caso em que é derivada automaticamente (RN049, SCRUM-54): precedência **status explícito no corpo > preferência do usuário > regra de data**. A regra de data compara o **dia** da _Transação_ com o dia atual em **UTC** — decisão técnica registrada aqui porque não há RN de fuso horário de negócio; o sistema não captura fuso do usuário em nenhum ponto, e este é o mesmo padrão já usado por `BillingDay` em `account.md`. A composição do saldo por situação (RN050) continua fora de escopo — ver "Ainda não existe".

## Mapa dos arquivos

| Artefato | Caminho (a partir de `server/`) | O que só ele sabe |
| -------- | ------------------------------- | ----------------- |
| `Transaction` (agregado) | `src/domain/transaction/enterprise/entities/transaction.ts` | Valor sempre positivo (RN041); `categoryId` obrigatório para `type` "INCOME"/"EXPENSE" e proibido para "TRANSFER" (RN042, RN043) — checagem estrutural, sem I/O, porque `type` e `categoryId` são ambos props da própria entidade; descrição trimada, vazia vira `null`. Constantes `INCOME_TYPE`/`EXPENSE_TYPE`/`TRANSFER_TYPE`/`CATEGORIZABLE_TYPES` e `PLANNED_STATUS`/`SETTLED_STATUS` são o vocabulário compartilhado com o schema Zod e com o caso de uso. Sem métodos de mutação: só existe `create` até aqui. |
| `TransactionType` | `src/domain/transaction/enterprise/value-objects/transaction-type.ts` | União de tipos sobre `TRANSACTION_TYPES` (RN039), mesma forma de `CategoryNature`. |
| `TransactionStatus` | `src/domain/transaction/enterprise/value-objects/transaction-status.ts` | União de tipos sobre `TRANSACTION_STATUSES` (RN048): `PLANNED` ("Prevista") e `SETTLED` ("Efetivada"). |
| `TransactionsRepository` (porta) | `src/domain/transaction/application/repositories/transactions-repository.ts` | Só `create` — nenhum outro caso de uso existe ainda que precise de `findById`/`save`/listagem. |
| `CreateTransactionUseCase` | `src/domain/transaction/application/use-cases/create-transaction.ts` | Único caso de uso do contexto. Aceita só `type` "INCOME"/"EXPENSE" no request (TypeScript recusa "TRANSFER" em tempo de compilação, e o schema Zod da rota faz o mesmo em tempo de execução) — é assim que a história não abre uma porta de transferência pela metade. Ordem das checagens: carrega a conta (dono e arquivamento), depois a categoria (dono, arquivamento, compatibilidade de natureza), só então chama `Transaction.create`. `status` do request é opcional (RN049): `resolveDefaultStatus` só é chamado quando omitido, lê `UsersRepository.findById(ownerId)` para a preferência (`User.defaultTransactionStatus`) e, na ausência dela, compara `date` com "hoje" em UTC via `isFutureDate` (`Date.UTC` truncado ao dia, sem hora) — futura vira `PLANNED`, igual ou anterior vira `SETTLED`. |
| `ResourceArchivedError` | `src/domain/transaction/application/use-cases/errors/resource-archived-error.ts` | Genérico dentro do contexto: mesma classe cobre conta arquivada (RN025) e categoria arquivada (RN035), com mensagem própria em cada `throw`. `RESOURCE_ARCHIVED`, sem entrada em `http-status-by-error-code.ts` — cai no padrão 400. |
| `CategoryNatureMismatchError` | `src/domain/transaction/application/use-cases/errors/category-nature-mismatch-error.ts` | RN042 (metade da compatibilidade de natureza). `CATEGORY_NATURE_MISMATCH`, também sem entrada no mapa — 400 pelo padrão. |
| Tabela `transactions` | `src/infra/database/drizzle/schemas/transactions.ts` | Enums `transaction_type` e `transaction_status` no Postgres; `category_id` nullable (vale para "TRANSFER", ainda não emitido); `date` é `date` (sem hora) — a data do lançamento, não um timestamp; `amount` é `moneyAmount` sempre positivo, sem coluna de sinal — o sinal é derivado do `type` por quem for somar saldo, não persistido. |
| `DrizzleTransactionMapper` | `src/infra/database/drizzle/mappers/drizzle-transaction-mapper.ts` | Tradução direta registro ↔ entidade, incluindo `categoryId` nullable. |
| `DrizzleTransactionsRepository` | `src/infra/database/drizzle/repositories/drizzle-transactions-repository.ts` | Só `insert` — espelha a porta mínima. |
| `InMemoryTransactionsRepository` | `src/infra/database/in-memory/in-memory-transactions-repository.ts` | Sem dependência de outro repositório (ao contrário de `InMemoryAccountsRepository`) — o spec do caso de uso monta os três repositórios (transação, conta, categoria) separadamente. |
| `CreateTransactionController` | `src/infra/http/controllers/create-transaction.controller.ts` | Schema Zod do corpo: `type` restrito a `['INCOME', 'EXPENSE']` (constante local, não reaproveita `TRANSACTION_TYPES` para não abrir "TRANSFER" na borda HTTP); `date` por `z.coerce.date()`; `amount` por `moneySchema`. |
| `TransactionPresenter` | `src/infra/http/presenters/transaction-presenter.ts` | `toHTTP` — resposta sem `ownerId`, com `categoryId` nullable e `amount` via `MoneyPresenter`. |

## Regras que o código garante

| RN | Onde é aplicada | Como falha |
| -- | --------------- | ---------- |
| RN039 | `TRANSACTION_TYPES`, enum `transaction_type` no banco e `Transaction.validateType` | Tipo fora do domínio → `InvariantError` (422). O enum tem os três valores; só "INCOME" e "EXPENSE" têm caminho de escrita hoje |
| RN040 | `Transaction.create` (data, valor, conta, tipo, situação) + `CreateTransactionUseCase` (conta) + schema Zod de `CreateTransactionController` | Campo ausente → 422 pelo `ZodValidationPipe`; conta inexistente ou alheia → `ResourceNotFoundError` (404, RN010/RN011) |
| RN041 | `Transaction.validateAmount` | Valor ≤ 0 → `InvariantError` (422). O sinal nunca é lido do cliente: o schema Zod só aceita um inteiro positivo em centavos (`moneySchema`), e não existe campo de sinal em lugar nenhum da fatia |
| RN042 | `Transaction.validateCategory` (categoria obrigatória para "INCOME"/"EXPENSE") + `CreateTransactionUseCase.isNatureCompatible` (natureza compatível) | Categoria ausente → `InvariantError` (422, estrutural, na entidade); natureza incompatível (`EXPENSE` em receita, `INCOME` em despesa) → `left(CategoryNatureMismatchError)` (400). Natureza `BOTH` é aceita nos dois tipos, comparando literalmente `category.nature === type`, porque os dois VOs usam os mesmos literais `'INCOME'`/`'EXPENSE'` |
| RN043 | `Transaction.validateCategory` (ramo inverso) | Categoria informada com `type` "TRANSFER" → `InvariantError` (422). Verificado mesmo sem caminho de escrita para "TRANSFER" hoje, porque é checagem estrutural gratuita sobre a própria entidade |
| RN048 | `TRANSACTION_STATUSES`, enum `transaction_status` no banco e `Transaction.validateStatus` | Situação fora do domínio → `InvariantError` (422). O schema Zod de `CreateTransactionController` aceita `status` **opcional**; quando informado, é sempre o que a `Transaction` recebe |
| RN049 | `CreateTransactionUseCase.resolveDefaultStatus` e `CreateTransactionUseCase.isFutureDate` | Só roda quando `status` não vem no corpo. Precedência: preferência do usuário (`User.defaultTransactionStatus`, lida via `UsersRepository`) prevalece sobre a regra de data; na ausência de preferência, `date` futura (em UTC, comparando só o dia) vira `PLANNED`, e `date` igual ou anterior a hoje vira `SETTLED`. Não lança erro — é derivação, não validação |
| RN025 | `CreateTransactionUseCase` (`account.isArchived`) | Conta arquivada → `left(ResourceArchivedError)` (400). Primeira aplicação real desta RN — `docs/domains/account.md` já previa a regra, mas nenhum contexto a consumia até agora |
| RN035 | `CreateTransactionUseCase` (`category.isArchived`) | Categoria arquivada → `left(ResourceArchivedError)` (400). Mesma situação: primeira aplicação real, `docs/domains/category.md` já previa |
| RN010, RN011 | `CreateTransactionUseCase` (conta e categoria) | Conta ou categoria inexistente **ou de outro usuário** → `ResourceNotFoundError` (404), indistinguíveis de propósito. `ownerId` nunca vem do cliente: sai do `@CurrentUser()` |

## Fronteiras

| Domínio | Direção | Ponto de contato | O que rege |
| ------- | ------- | ---------------- | ---------- |
| [Contas](account.md) | Transação → Conta | `CreateTransactionUseCase` injeta `AccountsRepository` para checar dono e arquivamento; `Transaction.accountId`; FK `transactions.account_id` | RN010, RN011, RN025, RN040 |
| [Categorias](category.md) | Transação → Categoria | `CreateTransactionUseCase` injeta `CategoriesRepository` para checar dono, arquivamento e natureza; `Transaction.categoryId`; FK `transactions.category_id` | RN010, RN011, RN035, RN042, RN043 |
| [Usuários](user.md) | Transação → Usuário | `Transaction.ownerId`, vindo do token; FK `transactions.owner_id`; `CreateTransactionUseCase` injeta `UsersRepository` para ler `User.defaultTransactionStatus` quando `status` não vem no corpo | RN010, RN011, RN049 |

A dependência é de mão única: nem _Contas_ nem _Categorias_ conhecem `Transaction` no domínio. O saldo real da conta (RN021, RN050) e o consumo de orçamento (RN070) vão inverter essa leitura no futuro, mas por consulta na infraestrutura — não por import de domínio.

## Persistência

Tabela `transactions`, criada pela migration `0011_create_transactions_table`.

| Coluna | Observação |
| ------ | ---------- |
| `owner_id`, `account_id`, `category_id` | FKs para `users`, `accounts` e `categories`; as três indexadas. `category_id` é a única nullable — hoje sempre preenchida, porque só "INCOME"/"EXPENSE" têm caminho de escrita |
| `type` | Enum `transaction_type` (`INCOME`, `EXPENSE`, `TRANSFER`) — valor novo exige migration |
| `status` | Enum `transaction_status` (`PLANNED`, `SETTLED`) |
| `date` | `date`, sem hora — é o dia do lançamento, não um timestamp de auditoria (esse é `created_at`) |
| `amount` | `moneyAmount` — `bigint` com `mode: 'number'`, inteiro em centavos (RNF004), sempre positivo |
| `description` | `text`, nullable — sem limite de tamanho por não haver RN que o defina |

## Contrato HTTP

| Rota | Controller | Caso de uso | Respostas |
| ---- | ---------- | ----------- | --------- |
| `POST /transactions` | `CreateTransactionController` | `CreateTransactionUseCase` | 201; 422 validação e invariante (campo ausente, valor ≤ 0, categoria ausente); 400 `RESOURCE_ARCHIVED` (conta ou categoria arquivada) ou `CATEGORY_NATURE_MISMATCH` (RN042); 404 conta ou categoria inexistente ou alheia; 401 sem token |

## Ainda não existe

| Operação | RN | O que a destrava |
| -------- | -- | ---------------- |
| Registrar transferência entre contas | RN043–RN047 | Story própria. A entidade já modela `type` "TRANSFER" e recusa categoria nesse caso (RN043), mas falta o par conta de origem/conta de destino (RN044), a checagem de grupo "Padrão" (RN045), a proibição de origem igual a destino (RN046) e a exclusão dos totais de relatório (RN047) — nenhum deles tem código hoje |
| Saldo real da conta por situação | RN050 | Story própria (posterior à SCRUM-55, que ainda vai adicionar efetivar/reverter). RN049 já existe, então "Efetivada" já tem sentido como filtro, mas `DrizzleAccountsRepository` ainda não lê a tabela `transactions` |
| Consulta, edição e exclusão de transação | RN040 | Só o registro existe. Edição herda a mesma checagem de compatibilidade de natureza; exclusão precisa decidir lógica vs. bloqueio (nenhuma RN cobre isso ainda — checar com a `business-analyst` antes de implementar) |
| Efetivar e reverter transação "Prevista" ↔ "Efetivada" depois de criada | RN048 | SCRUM-55. A situação (RN048) e a sua derivação automática na criação (RN049) já existem; falta a operação que muda o campo depois do registro criado — não coberta por esta fatia |
| Repetição, anexos, tags | RN037, RN051, RN059–RN068 | Contextos próprios (Tags, Repetição), sem RN nem código aqui |

## Onde tocar

**Operação nova** → caso de uso em `application/use-cases/` → método novo na porta `TransactionsRepository`, se precisar → implementar nos **dois** repositórios (Drizzle e in-memory) → controller → registrar em `HttpModule` com `useFactory` + `inject` → presenter → spec unitário e e2e. Mesmo roteiro de `account.md`/`category.md`.

**Habilitar "Transferência" (RN043–RN047)** → não é campo novo, é caminho de escrita novo: o `type` já existe no enum, mas o request do caso de uso precisa de `sourceAccountId`/`destinationAccountId` em vez de `accountId`+`categoryId`, o que é forma diferente o bastante para justificar um caso de uso próprio (`CreateTransferUseCase`) em vez de estender `CreateTransactionUseCase`. Decida com a `business-analyst` o texto exato antes de desenhar.

**Mexer na derivação da situação padrão (RN049)** → tudo mora em `CreateTransactionUseCase`: `resolveDefaultStatus` (precedência preferência-do-usuário → regra-de-data) e `isFutureDate` (comparação em UTC, truncada ao dia). Não mexe na entidade nem no schema Drizzle de `transactions` — o campo `status` já aceita os dois valores desde a SCRUM-52. A preferência em si mora no domínio `User` (`defaultTransactionStatus`, ver `user.md`); mudar o formato dela é tarefa desse contexto, não deste.

**Checar arquivamento de outro registro referenciado, dentro deste contexto** → reaproveite `ResourceArchivedError` (`@domain/transaction/application/use-cases/errors/resource-archived-error`) em vez de criar um erro por campo, como já é feito aqui para conta e categoria com a mesma classe. Se um domínio **fora** de `transaction` precisar da mesma checagem, não importe esta classe — a dependência entre contextos é de mão única (ver "Fronteiras"); decida com a `platform-architect` se o caso justifica promover o erro para `core/errors`.
