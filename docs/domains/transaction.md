# Transações

> **Contexto** `server/src/domain/transaction` · **Requisitos** RF008 · RN039–RN043, RN048–RN050, RN086–RN088

A _Transação_ é o lançamento financeiro do usuário: uma despesa, uma receita ou (modelada, mas não operante ainda) uma transferência entre contas. É o primeiro contexto que referencia dois outros ao mesmo tempo — _Conta_ e _Categoria_ — e por isso concentra as checagens de propriedade e de compatibilidade que cada um deles já antecipava em "Ainda não existe". Com a SCRUM-54 ele passa a referenciar também _Usuário_ para ler a preferência de situação padrão (ver "Fronteiras").

Hoje o contexto tem o registro (SCRUM-52) de receita e despesa e, com a SCRUM-55, a mutação de situação depois de criada: efetivar e reverter. Transferência (RN043–RN047) segue fora de escopo — ver "Ainda não existe". A **situação** (RN048) pode ser informada explicitamente no corpo do `POST /transactions` ou omitida, caso em que é derivada automaticamente (RN049, SCRUM-54): precedência **status explícito no corpo > preferência do usuário > regra de data**. A regra de data compara o **dia** da _Transação_ com o dia atual em **UTC** — decisão técnica registrada aqui porque não há RN de fuso horário de negócio; o sistema não captura fuso do usuário em nenhum ponto, e este é o mesmo padrão já usado por `BillingDay` em `account.md`.

**Efetivar e reverter (SCRUM-55).** `PATCH /transactions/:id/settle` move "Prevista" → "Efetivada" (RN048) e aceita opcionalmente a **data** em que a transação efetivamente ocorreu, substituindo a **data** original da _Transação_ (RN088) — não existe um campo de "data de efetivação" separado, é o mesmo campo `date` de sempre. `PATCH /transactions/:id/revert` faz o caminho inverso, sem tocar na data. As duas operações são guardas de estado, não idempotentes: efetivar uma _Transação_ já "Efetivada" é rejeitado (RN086), assim como reverter uma já "Prevista" (RN087) — decisão da `business-analyst` registrada nestas RNs porque nem RN048 nem RN050 diziam o que fazer com a repetição, e uma segunda chamada silenciosa poderia mascarar a intenção real do cliente (reafirmar a mesma situação vs. querer alterar a data de uma já efetivada). Nenhuma das duas mexe em `accountId`, `categoryId`, `type` ou `amount`. Como o **saldo** da _Conta_ (RN021) é calculado por agregação em consulta, não é um campo persistido em `accounts` — mudar a **situação** da _Transação_ já é, por si só, a operação atômica que altera o saldo; não existe uma segunda escrita a coordenar.

**Transferência fica de fora também aqui (decisão de sequenciamento).** O critério de aceite da SCRUM-55 sobre "efetivação atômica dos dois lados de uma transferência" pressupõe um caminho de registro de _Transação_ do tipo "Transferência" que não existe — SCRUM-52 modelou o `type` "TRANSFER" no enum e decidiu explicitamente não implementar o caso de uso (ver "Onde tocar"). RN048 e RN086–RN088 são genéricas por **situação**, não por **tipo**, e o código de `settle`/`revert` não faz nenhuma checagem de `type`: no dia em que "Transferência" ganhar um caminho de escrita, efetivá-la ou revertê-la já vai funcionar por este mesmo caso de uso, contanto que a atomização dos dois lados (dois `accountId`) seja resolvida na modelagem daquela story — não é reaberta aqui. Esta SCRUM-55, na prática, só efetiva/reverte "Receita" e "Despesa", porque só elas têm caminho de registro hoje.

## Mapa dos arquivos

| Artefato | Caminho (a partir de `server/`) | O que só ele sabe |
| -------- | ------------------------------- | ----------------- |
| `Transaction` (agregado) | `src/domain/transaction/enterprise/entities/transaction.ts` | Valor sempre positivo (RN041); `categoryId` obrigatório para `type` "INCOME"/"EXPENSE" e proibido para "TRANSFER" (RN042, RN043) — checagem estrutural, sem I/O, porque `type` e `categoryId` são ambos props da própria entidade; descrição trimada, vazia vira `null`. Constantes `INCOME_TYPE`/`EXPENSE_TYPE`/`TRANSFER_TYPE`/`CATEGORIZABLE_TYPES` e `PLANNED_STATUS`/`SETTLED_STATUS` são o vocabulário compartilhado com o schema Zod e com os casos de uso. Métodos de mutação: `settle(date?)` grava `SETTLED_STATUS` e, se `date` vier, substitui a **data** (RN088); `revert()` grava `PLANNED_STATUS`. Nenhum dos dois valida a situação atual — quem decide se a transição é permitida é o caso de uso (RN086, RN087), não a entidade; os dois passam por `touch()`, que atualiza `updatedAt`. |
| `TransactionType` | `src/domain/transaction/enterprise/value-objects/transaction-type.ts` | União de tipos sobre `TRANSACTION_TYPES` (RN039), mesma forma de `CategoryNature`. |
| `TransactionStatus` | `src/domain/transaction/enterprise/value-objects/transaction-status.ts` | União de tipos sobre `TRANSACTION_STATUSES` (RN048): `PLANNED` ("Prevista") e `SETTLED` ("Efetivada"). |
| `TransactionsRepository` (porta) | `src/domain/transaction/application/repositories/transactions-repository.ts` | `create`, `save` e `findById` (os dois últimos entraram na SCRUM-55, para `settle`/`revert` carregarem e persistirem a transação existente) — ainda sem listagem. |
| `CreateTransactionUseCase` | `src/domain/transaction/application/use-cases/create-transaction.ts` | Aceita só `type` "INCOME"/"EXPENSE" no request (TypeScript recusa "TRANSFER" em tempo de compilação, e o schema Zod da rota faz o mesmo em tempo de execução) — é assim que a história não abre uma porta de transferência pela metade. Ordem das checagens: carrega a conta (dono e arquivamento), depois a categoria (dono, arquivamento, compatibilidade de natureza), só então chama `Transaction.create`. `status` do request é opcional (RN049): `resolveDefaultStatus` só é chamado quando omitido, lê `UsersRepository.findById(ownerId)` para a preferência (`User.defaultTransactionStatus`) e, na ausência dela, compara `date` com "hoje" em UTC via `isFutureDate` (`Date.UTC` truncado ao dia, sem hora) — futura vira `PLANNED`, igual ou anterior vira `SETTLED`. |
| `SettleTransactionUseCase` | `src/domain/transaction/application/use-cases/settle-transaction.ts` | Carrega a transação pelo dono (RN010, RN011), rejeita quando já "Efetivada" (RN086, `TransactionStatusConflictError`), chama `Transaction.settle(date)` e persiste com `save`. Não checa arquivamento de conta/categoria — RN025/RN035 só regem o lançamento novo (RN040), não a mudança de situação de um já existente. |
| `RevertTransactionUseCase` | `src/domain/transaction/application/use-cases/revert-transaction.ts` | Espelho do `SettleTransactionUseCase`, chamando `Transaction.revert()` e rejeitando quando já "Prevista" (RN087). |
| `TransactionStatusConflictError` | `src/domain/transaction/application/use-cases/errors/transaction-status-conflict-error.ts` | `TRANSACTION_STATUS_CONFLICT`, mapeado para **409** em `http-status-by-error-code.ts` — é o único erro deste contexto com entrada própria no mapa, porque "conflito de estado" não se encaixa no padrão 400 dos outros dois erros da fatia. |
| `ResourceArchivedError` | `src/domain/transaction/application/use-cases/errors/resource-archived-error.ts` | Genérico dentro do contexto: mesma classe cobre conta arquivada (RN025) e categoria arquivada (RN035), com mensagem própria em cada `throw`. `RESOURCE_ARCHIVED`, sem entrada em `http-status-by-error-code.ts` — cai no padrão 400. |
| `CategoryNatureMismatchError` | `src/domain/transaction/application/use-cases/errors/category-nature-mismatch-error.ts` | RN042 (metade da compatibilidade de natureza). `CATEGORY_NATURE_MISMATCH`, também sem entrada no mapa — 400 pelo padrão. |
| Tabela `transactions` | `src/infra/database/drizzle/schemas/transactions.ts` | Enums `transaction_type` e `transaction_status` no Postgres; `category_id` nullable (vale para "TRANSFER", ainda não emitido); `date` é `date` (sem hora) — a data do lançamento, e também a data de efetivação depois do `settle` (RN088), não um timestamp; `amount` é `moneyAmount` sempre positivo, sem coluna de sinal — o sinal é derivado do `type` por quem for somar saldo, não persistido. Sem migration nova na SCRUM-55: `status` já aceitava os dois valores desde a SCRUM-52. |
| `DrizzleTransactionMapper` | `src/infra/database/drizzle/mappers/drizzle-transaction-mapper.ts` | Tradução direta registro ↔ entidade, incluindo `categoryId` nullable. |
| `DrizzleTransactionsRepository` | `src/infra/database/drizzle/repositories/drizzle-transactions-repository.ts` | `insert`, `update` por `id` (`save`) e `select` por `id` (`findById`). |
| `InMemoryTransactionsRepository` | `src/infra/database/in-memory/in-memory-transactions-repository.ts` | Sem dependência de outro repositório (ao contrário de `InMemoryAccountsRepository`) — o spec do caso de uso monta os três repositórios (transação, conta, categoria) separadamente. `save` substitui o item pelo índice do `id`, mesmo padrão de `InMemoryAccountsRepository`. |
| `CreateTransactionController` | `src/infra/http/controllers/create-transaction.controller.ts` | Schema Zod do corpo: `type` restrito a `['INCOME', 'EXPENSE']` (constante local, não reaproveita `TRANSACTION_TYPES` para não abrir "TRANSFER" na borda HTTP); `date` por `z.coerce.date()`; `amount` por `moneySchema`. |
| `SettleTransactionController` | `src/infra/http/controllers/settle-transaction.controller.ts` | `PATCH /transactions/:id/settle`, corpo `{ date? }` opcional via `z.coerce.date().optional()` — é o único ponto de entrada HTTP para RN088. |
| `RevertTransactionController` | `src/infra/http/controllers/revert-transaction.controller.ts` | `PATCH /transactions/:id/revert`, sem corpo. |
| `TransactionPresenter` | `src/infra/http/presenters/transaction-presenter.ts` | `toHTTP` — resposta sem `ownerId`, com `categoryId` nullable e `amount` via `MoneyPresenter`. Reaproveitado por `settle` e `revert`, sem mudança. |

## Regras que o código garante

| RN | Onde é aplicada | Como falha |
| -- | --------------- | ---------- |
| RN039 | `TRANSACTION_TYPES`, enum `transaction_type` no banco e `Transaction.validateType` | Tipo fora do domínio → `InvariantError` (422). O enum tem os três valores; só "INCOME" e "EXPENSE" têm caminho de escrita hoje |
| RN040 | `Transaction.create` (data, valor, conta, tipo, situação) + `CreateTransactionUseCase` (conta) + schema Zod de `CreateTransactionController` | Campo ausente → 422 pelo `ZodValidationPipe`; conta inexistente ou alheia → `ResourceNotFoundError` (404, RN010/RN011) |
| RN041 | `Transaction.validateAmount` | Valor ≤ 0 → `InvariantError` (422). O sinal nunca é lido do cliente: o schema Zod só aceita um inteiro positivo em centavos (`moneySchema`), e não existe campo de sinal em lugar nenhum da fatia |
| RN042 | `Transaction.validateCategory` (categoria obrigatória para "INCOME"/"EXPENSE") + `CreateTransactionUseCase.isNatureCompatible` (natureza compatível) | Categoria ausente → `InvariantError` (422, estrutural, na entidade); natureza incompatível (`EXPENSE` em receita, `INCOME` em despesa) → `left(CategoryNatureMismatchError)` (400). Natureza `BOTH` é aceita nos dois tipos, comparando literalmente `category.nature === type`, porque os dois VOs usam os mesmos literais `'INCOME'`/`'EXPENSE'` |
| RN043 | `Transaction.validateCategory` (ramo inverso) | Categoria informada com `type` "TRANSFER" → `InvariantError` (422). Verificado mesmo sem caminho de escrita para "TRANSFER" hoje, porque é checagem estrutural gratuita sobre a própria entidade |
| RN048 | `TRANSACTION_STATUSES`, enum `transaction_status` no banco, `Transaction.validateStatus`, `Transaction.settle`/`revert` | Situação fora do domínio → `InvariantError` (422) na criação. `settle`/`revert` só transitam entre "Prevista" e "Efetivada", os dois únicos valores do enum — não há terceiro estado a validar |
| RN049 | `CreateTransactionUseCase.resolveDefaultStatus` e `CreateTransactionUseCase.isFutureDate` | Só roda quando `status` não vem no corpo. Precedência: preferência do usuário (`User.defaultTransactionStatus`, lida via `UsersRepository`) prevalece sobre a regra de data; na ausência de preferência, `date` futura (em UTC, comparando só o dia) vira `PLANNED`, e `date` igual ou anterior a hoje vira `SETTLED`. Não lança erro — é derivação, não validação |
| RN050 | `DrizzleAccountsRepository.findManyByOwnerId` (`leftJoin` com `transactions` + `sum` condicional por `status`/`type`) e `InMemoryAccountsRepository.calculateBalance` | Só as transações com `status = 'SETTLED'` entram na soma que compõe o **saldo** devolvido por `GET /accounts` (RN021); "Prevista" nunca entra ali. O **saldo projetado** (a metade "Previstas" da regra) ainda não tem consulta própria — ver "Ainda não existe" em `account.md` |
| RN086 | `SettleTransactionUseCase` (`transaction.status === SETTLED_STATUS`) | Transação já "Efetivada" → `left(TransactionStatusConflictError)` (409). Decisão da `business-analyst`: não idempotente, rejeição explícita — repetir a efetivação não é tratado como "sem operação" porque poderia mascarar a intenção de só ajustar a data (RN088) |
| RN087 | `RevertTransactionUseCase` (`transaction.status === PLANNED_STATUS`) | Transação já "Prevista" → `left(TransactionStatusConflictError)` (409). Espelho da RN086 |
| RN088 | `Transaction.settle(date)` e `SettleTransactionController` (corpo `{ date? }`) | `date` omitido mantém a **data** original da _Transação_; informado, substitui `Transaction.date` no mesmo `settle()` que muda a situação — uma única escrita, sem campo de "data de efetivação" separado |
| RN025 | `CreateTransactionUseCase` (`account.isArchived`) | Conta arquivada → `left(ResourceArchivedError)` (400). Primeira aplicação real desta RN — `docs/domains/account.md` já previa a regra, mas nenhum contexto a consumia até agora. `settle`/`revert` não repetem esta checagem — ver a entrada de `SettleTransactionUseCase` no mapa de arquivos |
| RN035 | `CreateTransactionUseCase` (`category.isArchived`) | Categoria arquivada → `left(ResourceArchivedError)` (400). Mesma situação: primeira aplicação real, `docs/domains/category.md` já previa |
| RN010, RN011 | `CreateTransactionUseCase` (conta e categoria), `SettleTransactionUseCase`/`RevertTransactionUseCase` (transação) | Registro inexistente **ou de outro usuário** → `ResourceNotFoundError` (404), indistinguíveis de propósito. `ownerId` nunca vem do cliente: sai do `@CurrentUser()` |

## Fronteiras

| Domínio | Direção | Ponto de contato | O que rege |
| ------- | ------- | ---------------- | ---------- |
| [Contas](account.md) | Transação → Conta | `CreateTransactionUseCase` injeta `AccountsRepository` para checar dono e arquivamento; `Transaction.accountId`; FK `transactions.account_id` | RN010, RN011, RN025, RN040 |
| [Categorias](category.md) | Transação → Categoria | `CreateTransactionUseCase` injeta `CategoriesRepository` para checar dono, arquivamento e natureza; `Transaction.categoryId`; FK `transactions.category_id` | RN010, RN011, RN035, RN042, RN043 |
| [Usuários](user.md) | Transação → Usuário | `Transaction.ownerId`, vindo do token; FK `transactions.owner_id`; `CreateTransactionUseCase` injeta `UsersRepository` para ler `User.defaultTransactionStatus` quando `status` não vem no corpo | RN010, RN011, RN049 |

A dependência é de mão única: nem _Contas_ nem _Categorias_ conhecem `Transaction` no domínio. O saldo real da conta (RN021, RN050) já inverte essa leitura, mas por consulta na infraestrutura — `DrizzleAccountsRepository` faz `leftJoin` em `transactions`, não há import de domínio em nenhum sentido. O consumo de orçamento (RN070) ainda vai fazer o mesmo no futuro.

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
| `PATCH /transactions/:id/settle` | `SettleTransactionController` | `SettleTransactionUseCase` | 200; corpo `{ date? }`; 409 `TRANSACTION_STATUS_CONFLICT` (RN086, já "Efetivada"); 404 transação inexistente ou alheia; 401 sem token |
| `PATCH /transactions/:id/revert` | `RevertTransactionController` | `RevertTransactionUseCase` | 200; sem corpo; 409 `TRANSACTION_STATUS_CONFLICT` (RN087, já "Prevista"); 404 transação inexistente ou alheia; 401 sem token |

## Ainda não existe

| Operação | RN | O que a destrava |
| -------- | -- | ---------------- |
| Registrar transferência entre contas | RN043–RN047 | Story própria, ainda não planejada nesta sprint. A entidade já modela `type` "TRANSFER" e recusa categoria nesse caso (RN043), mas falta o par conta de origem/conta de destino (RN044), a checagem de grupo "Padrão" (RN045), a proibição de origem igual a destino (RN046) e a exclusão dos totais de relatório (RN047) — nenhum deles tem código hoje. `settle`/`revert` (SCRUM-55) já são genéricos por **situação** e não fazem nenhuma checagem de `type`: quando essa story existir, efetivar/reverter uma transferência funciona pelo mesmo caso de uso — a atomicidade dos dois lados (dois `accountId`) é modelagem daquela story, não reaberta aqui |
| Saldo projetado da conta (metade "Previstas" da RN050) | RN050, RN079 | O saldo real (metade "Efetivadas") já existe desde a SCRUM-55, via `DrizzleAccountsRepository`. O saldo projetado é reporte/painel (RN079), sem endpoint ainda — outro contexto |
| Consulta, edição e exclusão de transação | RN040 | Só o registro e a mutação de situação existem. Edição herda a mesma checagem de compatibilidade de natureza; exclusão precisa decidir lógica vs. bloqueio (nenhuma RN cobre isso ainda — checar com a `business-analyst` antes de implementar) |
| Repetição, anexos, tags | RN037, RN051, RN059–RN068 | Contextos próprios (Tags, Repetição), sem RN nem código aqui |

## Onde tocar

**Operação nova** → caso de uso em `application/use-cases/` → método novo na porta `TransactionsRepository`, se precisar → implementar nos **dois** repositórios (Drizzle e in-memory) → controller → registrar em `HttpModule` com `useFactory` + `inject` → presenter → spec unitário e e2e. Mesmo roteiro de `account.md`/`category.md`.

**Mexer em efetivar/reverter (RN086–RN088)** → guarda de estado mora no caso de uso (`SettleTransactionUseCase`/`RevertTransactionUseCase`), não na entidade — `Transaction.settle`/`revert` só mutam, sem checar a situação atual. Se a regra de conflito mudar (por exemplo, virar idempotente), o ponto único é o `if` no início do `execute` de cada caso de uso. A data de efetivação (RN088) é só mais um parâmetro de `settle`; não crie campo novo no schema Drizzle, é o mesmo `date`.

**Habilitar "Transferência" (RN043–RN047)** → não é campo novo, é caminho de escrita novo: o `type` já existe no enum, mas o request do caso de uso precisa de `sourceAccountId`/`destinationAccountId` em vez de `accountId`+`categoryId`, o que é forma diferente o bastante para justificar um caso de uso próprio (`CreateTransferUseCase`) em vez de estender `CreateTransactionUseCase`. Decida com a `business-analyst` o texto exato antes de desenhar.

**Mexer na derivação da situação padrão (RN049)** → tudo mora em `CreateTransactionUseCase`: `resolveDefaultStatus` (precedência preferência-do-usuário → regra-de-data) e `isFutureDate` (comparação em UTC, truncada ao dia). Não mexe na entidade nem no schema Drizzle de `transactions` — o campo `status` já aceita os dois valores desde a SCRUM-52. A preferência em si mora no domínio `User` (`defaultTransactionStatus`, ver `user.md`); mudar o formato dela é tarefa desse contexto, não deste.

**Checar arquivamento de outro registro referenciado, dentro deste contexto** → reaproveite `ResourceArchivedError` (`@domain/transaction/application/use-cases/errors/resource-archived-error`) em vez de criar um erro por campo, como já é feito aqui para conta e categoria com a mesma classe. Se um domínio **fora** de `transaction` precisar da mesma checagem, não importe esta classe — a dependência entre contextos é de mão única (ver "Fronteiras"); decida com a `platform-architect` se o caso justifica promover o erro para `core/errors`.
