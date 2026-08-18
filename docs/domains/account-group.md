# Grupos de Contas

> **Contexto** `server/src/domain/account-group` · **Requisitos** RF003 · RN015–RN017, RN085

O _Grupo de Contas_ organiza as contas do usuário e, mais do que isso, **decide a natureza delas**: é o `type` do grupo — "Padrão" ou "Cartão de Crédito" — que determina se a conta vinculada tem saldo ou limite (RN015, RN022). Por isso um contexto pequeno em código pesa bastante nas fronteiras: quase toda regra de _Contas_ depende de ler este tipo.

O termo _Conta_ substituiu _Ativo_ na SCRUM-88 — `Asset` ficou reservado ao instrumento negociável de uma eventual carteira de investimentos. A migration `0004_rename_asset_groups_to_account_groups` renomeia tabela, enum, índice e constraints, sem tocar no SQL já aplicado.

## Mapa dos arquivos

| Artefato | Caminho (a partir de `server/`) | O que só ele sabe |
| -------- | ------------------------------- | ----------------- |
| `AccountGroup` (agregado) | `src/domain/account-group/enterprise/entities/account-group.ts` | Nome não vazio de até 120 caracteres; tipo válido, com `DEFAULT` assumido quando omitido (RN016). Expõe `DEFAULT_TYPE` e `CREDIT_CARD_TYPE` — é por essas constantes que os outros contextos comparam o tipo, nunca por literal. `changeName` e `changeType` reaplicam as mesmas validações do `create` e chamam `touch()` (atualiza `updatedAt`); nenhum dos dois sabe da RN085 — o bloqueio por contas vinculadas não é invariante da entidade. |
| `AccountGroupType` | `src/domain/account-group/enterprise/value-objects/account-group-type.ts` | União de tipos sobre `ACCOUNT_GROUP_TYPES`, não uma classe. É o vocabulário compartilhado com _Contas_ e com os schemas Zod. |
| `AccountGroupsRepository` (porta) | `src/domain/account-group/application/repositories/account-groups-repository.ts` | `findById` e `findManyByOwnerId` devolvem `AccountGroupWithAccountsCount` — nunca o agregado sozinho. A contagem é parte do contrato de leitura. `save` persiste o agregado já mutado (usado por `UpdateAccountGroupUseCase`). |
| `CreateAccountGroupUseCase` | `src/domain/account-group/application/use-cases/create-account-group.ts` | `Either<never, ...>` — não tem caminho de erro; o que pode falhar é invariante da entidade. |
| `GetAccountGroupUseCase` | `src/domain/account-group/application/use-cases/get-account-group.ts` | Reúne "não existe" e "é de outro usuário" na mesma guard clause. |
| `ListAccountGroupsUseCase` | `src/domain/account-group/application/use-cases/list-account-groups.ts` | Repassa o filtro de tipo ao repositório; `Either<never, ...>`. |
| `UpdateAccountGroupUseCase` | `src/domain/account-group/application/use-cases/update-account-group.ts` | Compara o `type` recebido com o `type` atual **antes** de chamar `changeType`: só quando os dois divergem e `accountsCount > 0` retorna `NotAllowedError` (RN085). `name` é sempre reaplicado, mesmo sem mudança — é substituição completa (semântica de `PUT`), igual ao `UpdateUserProfileUseCase`. Devolve o mesmo formato de `GetAccountGroupUseCase` (`AccountGroupWithAccountsCount`). |
| Tabela `account_groups` | `src/infra/database/drizzle/schemas/account-groups.ts` | Enum `account_group_type` no Postgres; índice por dono. |
| `DrizzleAccountGroupMapper` | `src/infra/database/drizzle/mappers/drizzle-account-group-mapper.ts` | Tradução direta registro ↔ entidade. |
| `DrizzleAccountGroupsRepository` | `src/infra/database/drizzle/repositories/drizzle-account-groups-repository.ts` | Conta as contas por `leftJoin` + `groupBy` na **mesma** consulta — sem N+1 e sem contagem em memória. Ordena por nome. `save` faz `update` por `id`, sem tocar em `accounts`. |
| `InMemoryAccountGroupsRepository` | `src/infra/database/in-memory/in-memory-account-groups-repository.ts` | Expõe `accountsCountByAccountGroupId` (um `Map`) para o spec fixar a contagem sem criar contas reais. Ausente no mapa, conta zero. `save` substitui o item pelo `id` na lista `items`. |
| Controllers | `src/infra/http/controllers/{create,list,get,update}-account-group.controller.ts` | Um arquivo por rota. `UpdateAccountGroupController` exige `name` e `type` no corpo (sem default — a edição é substituição completa, diferente da criação). |
| `AccountGroupPresenter` | `src/infra/http/presenters/account-group-presenter.ts` | `toHTTP(accountGroup, accountsCount)` — a contagem entra por parâmetro, porque não é atributo do agregado. |

## Regras que o código garante

| RN | Onde é aplicada | Como falha |
| -- | --------------- | ---------- |
| RN015 | `ACCOUNT_GROUP_TYPES`, enum `account_group_type` no banco e schemas Zod das rotas | Tipo fora do domínio → 422 pelo `ZodValidationPipe`; se chegar por outro caminho, `InvariantError` na entidade |
| RN016 | `AccountGroup.create` e `AccountGroup.changeName`/`changeType` | Nome vazio ou acima de 120 caracteres → `InvariantError` (422). Tipo omitido na criação assume `DEFAULT`; na edição o `type` é obrigatório no corpo |
| RN017 | **Não implementada.** O `accountsCount` existe para o cliente antecipar o bloqueio sem uma segunda requisição | — |
| RN085 | `UpdateAccountGroupUseCase` | `type` recebido diferente do atual e `accountsCount > 0` → `NotAllowedError` (403). Mesmo tipo ou `accountsCount === 0` passa |
| RN010, RN011 | `GetAccountGroupUseCase`, `UpdateAccountGroupUseCase` e `findManyByOwnerId` | Grupo inexistente ou de outro usuário → `ResourceNotFoundError` (404), indistinguíveis. O `ownerId` vem do `@CurrentUser()` |

## Fronteiras

| Domínio | Direção | Ponto de contato | O que rege |
| ------- | ------- | ---------------- | ---------- |
| [Contas](account.md) | Conta → Grupo | `CreateAccountUseCase` injeta esta porta para ler o tipo; `AccountGroupType` é importado pelo filtro de listagem de contas; FK `accounts.account_group_id` | RN015, RN018, RN019 |
| [Usuários](user.md) | Grupo → Usuário | `AccountGroup.ownerId`, vindo do token; FK `account_groups.owner_id` | RN010, RN011 |

No **domínio**, este contexto não conhece `Account` — a dependência é de mão única. O acoplamento existe só na infraestrutura: o `DrizzleAccountGroupsRepository` faz join com a tabela `accounts` para contar, e o `InMemoryAccountsRepository` recebe o `InMemoryAccountGroupsRepository` no construtor para resolver o filtro por tipo. Esse segundo ponto é o que costuma surpreender em spec.

## Persistência

Tabela `account_groups`, criada como `asset_groups` pela migration `0003_create_asset_groups_table` e renomeada por `0004_rename_asset_groups_to_account_groups`.

| Coluna | Observação |
| ------ | ---------- |
| `owner_id` | FK para `users`, indexada por `account_groups_owner_id_index` |
| `name` | `varchar(120)` |
| `type` | Enum `account_group_type` do Postgres — valor novo exige migration, não é `varchar` livre |

## Contrato HTTP

| Rota | Controller | Caso de uso | Respostas |
| ---- | ---------- | ----------- | --------- |
| `POST /account-groups` | `CreateAccountGroupController` | `CreateAccountGroupUseCase` | 201; 422 validação e invariante |
| `GET /account-groups` | `ListAccountGroupsController` | `ListAccountGroupsUseCase` | 200; filtro opcional `?type=DEFAULT\|CREDIT_CARD`, valor fora do domínio → 422 |
| `GET /account-groups/:id` | `GetAccountGroupController` | `GetAccountGroupUseCase` | 200; 404 inexistente ou alheio |
| `PUT /account-groups/:id` | `UpdateAccountGroupController` | `UpdateAccountGroupUseCase` | 200; 404 inexistente ou alheio; 403 alteração de tipo bloqueada (RN085); 422 validação e invariante |

As quatro respondem pela mesma representação, com `accountsCount`.

## Ainda não existe

| Operação | RN | O que a destrava |
| -------- | -- | ---------------- |
| Exclusão bloqueada por contas vinculadas | RN017 | Nada; a contagem já está disponível no `findById` |

## Onde tocar

**Tipo novo de grupo** → `ACCOUNT_GROUP_TYPES` → constante na entidade → enum no schema Drizzle **e migration** → schemas Zod das rotas de grupo e de conta → e, principalmente, revisar [Contas](account.md): cada tipo decide quais campos da conta valem, e essa decisão mora no `CreateAccountUseCase`.

**Campo novo no grupo** → entidade → `schemas/account-groups.ts` → migration → mapper → schema Zod (criação **e** edição) → presenter → `test/factories/make-account-group.ts` → specs.

**Implementar a exclusão (RN017)** → método na porta → `DrizzleAccountGroupsRepository` e `InMemoryAccountGroupsRepository` → caso de uso que recusa quando `accountsCount > 0` (mesmo formato de guard clause do `UpdateAccountGroupUseCase` para a RN085) → erro de negócio próprio herdando de `BaseError`, ou reaproveitar `NotAllowedError` como fez a edição → controller → `HttpModule`.
