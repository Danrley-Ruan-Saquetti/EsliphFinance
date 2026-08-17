# Categorias

> **Contexto** `server/src/domain/category` · **Requisitos** RF006 · RN029–RN035, RN083, RN084

A _Categoria_ classifica receitas e despesas do usuário. O que a distingue de um rótulo qualquer é a **natureza**: "Receita", "Despesa" ou "Ambas" (RN030), que mais tarde decide quais _Transações_ podem usá-la (RN042) e quais subcategorias podem pendurar-se nela (RN033).

Hoje o contexto tem o cadastro raiz (SCRUM-45), o vínculo de subcategoria (SCRUM-46) e arquivar/desarquivar/excluir (SCRUM-49). Edição e listagem em árvore estão especificadas mas não existem em código — ver "Ainda não existe". A tabela nasceu sem `parent_id` e sem `archived_at` de propósito: cada uma entra pela migration da história que a implementar, como foi com `accounts` (`0006` e `0007`); `parent_id` entrou pela `0009`, `archived_at` pela `0010`.

## Mapa dos arquivos

| Artefato | Caminho (a partir de `server/`) | O que só ele sabe |
| -------- | ------------------------------- | ----------------- |
| `Category` (agregado) | `src/domain/category/enterprise/entities/category.ts` | Nome não vazio de até 120 caracteres, ícone em kebab-case normalizado para minúsculas, cor `#RRGGBB` normalizada para maiúsculas, natureza dentro do domínio (RN029, RN030) e `parentId` opcional (RN031), que só é definido na criação. Dois métodos de mutação, únicos que existem hoje: `archive()` e `unarchive()`, que alternam `archivedAt` e chamam o `touch()` privado (atualiza `updatedAt`) — mesmo padrão de `User.changeName`/`changeEmail`. Sem renomear, sem mover: isso é do SCRUM-47. Expõe `INCOME_NATURE`, `EXPENSE_NATURE` e `BOTH_NATURE`, e é por essas constantes que os outros contextos comparam a natureza, nunca por literal. |
| `CategoryNature` | `src/domain/category/enterprise/value-objects/category-nature.ts` | União de tipos sobre `CATEGORY_NATURES`, não uma classe — mesma forma de `AccountGroupType`. É o vocabulário compartilhado com o schema Zod da rota e, no futuro, com _Transações_. |
| `CategoriesRepository` (porta) | `src/domain/category/application/repositories/categories-repository.ts` | `create`, `save`, `delete`, `findById` e `hasSubcategories`. `save` persiste as mutações de `archive`/`unarchive`; `hasSubcategories` é a checagem de vínculo da RN034 (existe alguma categoria com este `parentId`). |
| `validateSubcategoryHierarchy` | `src/domain/category/application/use-cases/validate-subcategory-hierarchy.ts` | Função pura, reutilizável por qualquer caso de uso que vincule ou mova uma categoria: recebe a categoria pai e a natureza da filha, aplica RN032 (pai não pode já ser subcategoria) e RN033 (compatibilidade de natureza), devolve o erro específico ou `null`. Não faz I/O nem sabe de `ownerId` — quem chama já resolveu a busca e a checagem de dono. |
| `InvalidCategoryHierarchyError` / `IncompatibleCategoryNatureError` | `src/domain/category/application/use-cases/errors/` | Erros de negócio de RN032 e RN033, devolvidos como `left` pelo caso de uso; sem código registrado em `http-status-by-error-code.ts`, então a borda HTTP responde 400 pelo padrão do mapa (mesmo comportamento de `InvalidAccountGroupTypeError`). |
| `CreateCategoryUseCase` | `src/domain/category/application/use-cases/create-category.ts` | `Either<ResourceNotFoundError \| InvalidCategoryHierarchyError \| IncompatibleCategoryNatureError, ...>`. Sem `parentId`, comportamento idêntico ao SCRUM-45 (nunca falha, exceto por invariante da entidade). Com `parentId`, carrega o pai por `findById`, trata pai inexistente ou de outro dono como não encontrado (RN010, RN011) e delega a `validateSubcategoryHierarchy`. Auto-referência é impossível de ocorrer aqui: o id da categoria nova só existe depois do `create`, então não há como o cliente informar o próprio id como `parentId` — essa checagem é do SCRUM-47 (mover categoria existente). |
| `ArchiveCategoryUseCase` / `UnarchiveCategoryUseCase` | `src/domain/category/application/use-cases/archive-category.ts` / `unarchive-category.ts` | `Either<ResourceNotFoundError, { category }>`. Carregam por `findById`, tratam ausência ou dono diferente como não encontrado (RN010, RN011), chamam a mutação da entidade e persistem com `save`. Idempotentes: arquivar uma categoria já arquivada apenas atualiza `archivedAt` de novo, sem erro. |
| `DeleteCategoryUseCase` | `src/domain/category/application/use-cases/delete-category.ts` | `Either<ResourceNotFoundError \| NotAllowedError, null>`, mesma forma de `EndSessionUseCase` para sucesso sem corpo. Rejeita com `NotAllowedError` (usa o erro genérico de `@core/errors`, primeiro uso dele no repositório — 403) quando `hasSubcategories` é verdadeiro, com a mensagem orientando a arquivar. **Não verifica vínculo com _Transações_**: o domínio não existe ainda, então a RN034 só está coberta na parte de subcategoria — ver "Ainda não existe". |
| Tabela `categories` | `src/infra/database/drizzle/schemas/categories.ts` | Enum `category_nature` no Postgres; `parent_id` auto-referenciado (nullable, FK para `categories.id`, sem `ON DELETE`); `archived_at` nullable; índice por dono e por `parent_id`. |
| `DrizzleCategoryMapper` | `src/infra/database/drizzle/mappers/drizzle-category-mapper.ts` | Tradução direta registro ↔ entidade, incluindo `parentId` e `archivedAt` nullable. |
| `DrizzleCategoriesRepository` | `src/infra/database/drizzle/repositories/drizzle-categories-repository.ts` | Insert simples; `save` é `update` por id; `delete` é exclusão física (a RN034 é quem decide se a operação chega até aqui); `findById` por igualdade de id, sem checagem de dono; `hasSubcategories` seleciona 1 registro com o `parentId` informado. |
| `InMemoryCategoriesRepository` | `src/infra/database/in-memory/in-memory-categories-repository.ts` | Sem dependência de outro repositório — o spec monta um objeto só. `findById`/`hasSubcategories` varrem `items`; `save`/`delete` operam por índice. |
| `CreateCategoryController` | `src/infra/http/controllers/create-category.controller.ts` | Schema Zod do corpo: os quatro campos originais continuam obrigatórios; `parentId` é um UUID opcional. A natureza é validada contra `CATEGORY_NATURES`. |
| `ArchiveCategoryController` / `UnarchiveCategoryController` | `src/infra/http/controllers/archive-category.controller.ts` / `unarchive-category.controller.ts` | `PATCH /categories/:id/archive` e `/:id/unarchive`, `:id` validado como UUID pelo schema Zod dos params. Devolvem a categoria via `CategoryPresenter`. |
| `DeleteCategoryController` | `src/infra/http/controllers/delete-category.controller.ts` | `DELETE /categories/:id`, 204 sem corpo. |
| `CategoryPresenter` | `src/infra/http/presenters/category-presenter.ts` | `toHTTP` — resposta sem `ownerId`, com `parentId` e `archivedAt` (string/Date ou `null`), como nos demais contextos. |

## Regras que o código garante

| RN | Onde é aplicada | Como falha |
| -- | --------------- | ---------- |
| RN029 | `Category.create` (nome, ícone, cor) + schema Zod de `CreateCategoryController` | Nome vazio ou acima de 120 caracteres, ícone fora do kebab-case ou acima de 60 caracteres, cor fora de `#RRGGBB` → `InvariantError` (422); pela borda HTTP o erro sai antes, como `VALIDATION_FAILED` com `details[].field`. **Nenhum dos quatro campos tem default**: a RN029 não prevê nenhum, ao contrário da RN016 e da RN018, que dizem explicitamente o valor assumido. É a diferença em relação a `Account`, onde o ícone é opcional. |
| RN030 | `CATEGORY_NATURES`, enum `category_nature` no banco, schema Zod da rota e `Category.validateNature` | Natureza fora do domínio → 422 pelo `ZodValidationPipe`; chegando por mapper ou caso de uso futuro, `InvariantError`. Os valores persistidos são `INCOME`, `EXPENSE` e `BOTH` |
| RN031 | `CreateCategoryUseCase` (campo `parentId` opcional) + coluna `parent_id` | Só se aplica quando `parentId` é informado; sem ele o comportamento é o do SCRUM-45 |
| RN032 | `validateSubcategoryHierarchy` | Pai que já é subcategoria (`parent.parentId` preenchido) → `left(InvalidCategoryHierarchyError)`, HTTP 400. Auto-referência e "pai que já tem filhas não pode virar subcategoria" ficam para o SCRUM-47, que introduz mover uma categoria existente |
| RN033 | `validateSubcategoryHierarchy` | Pai com natureza `INCOME` ou `EXPENSE` e filha de natureza diferente → `left(IncompatibleCategoryNatureError)`, HTTP 400; pai `BOTH` aceita qualquer natureza de filha |
| RN034 | `DeleteCategoryUseCase` (`hasSubcategories`) | Categoria com subcategoria vinculada → `left(NotAllowedError)`, HTTP 403, mensagem orienta a arquivar. **Vínculo com _Transações_ não é verificado** — o domínio não existe; falta destravar quando ele existir. |
| RN035, RN084 | **Não implementadas.** `archived_at` existe e é persistido, mas nenhuma consulta filtra por ele ainda — depende da listagem do SCRUM-48 | — |
| RN083 | `ArchiveCategoryUseCase` / `UnarchiveCategoryUseCase` | `archive()`/`unarchive()` na entidade, idempotentes; dono verificado antes (RN010, RN011) |
| RN010, RN011 | `CreateCategoryUseCase` | O `ownerId` nunca vem do cliente: sai do `@CurrentUser()` e é aplicado depois do corpo (`{ ...body, ownerId: currentUser.id }`), então `ownerId` forjado no JSON é ignorado |

## Fronteiras

| Domínio | Direção | Ponto de contato | O que rege |
| ------- | ------- | ---------------- | ---------- |
| [Usuários](user.md) | Categoria → Usuário | `Category.ownerId`, vindo do token; FK `categories.owner_id` | RN010, RN011 |
| Categoria → Categoria | Subcategoria → Categoria | `parent_id` na mesma tabela (FK auto-referenciada), validado em `validateSubcategoryHierarchy` | RN031, RN032, RN033 |
| Transações _(não existe)_ | Transação → Categoria | Vai comparar a natureza com o tipo da transação e completar o bloqueio de exclusão da categoria (hoje `DeleteCategoryUseCase` só verifica subcategoria vinculada) | RN034, RN042 |

Hoje o contexto não importa nem é importado por nenhum outro domínio — é a fatia mais isolada do backend.

## Persistência

Tabela `categories`, criada pela migration `0008_create_categories_table`; `parent_id` entrou pela `0009_add-category-parent-id`, `archived_at` pela `0010_add-category-archived-at`.

| Coluna | Observação |
| ------ | ---------- |
| `owner_id` | FK para `users`, indexada por `categories_owner_id_index` |
| `parent_id` | FK para `categories.id` (auto-referenciada), nullable, sem `ON DELETE`; indexada por `categories_parent_id_index` |
| `name` | `varchar(120)` |
| `nature` | Enum `category_nature` do Postgres — valor novo exige migration, não é `varchar` livre |
| `icon` | `varchar(60)`, guardado em minúsculas |
| `color` | `char(7)`, guardada em maiúsculas |
| `archived_at` | `timestamp with time zone`, nullable; preenchida por `archive()`, limpa por `unarchive()` |

## Contrato HTTP

| Rota | Controller | Caso de uso | Respostas |
| ---- | ---------- | ----------- | --------- |
| `POST /categories` | `CreateCategoryController` | `CreateCategoryUseCase` | 201; 422 validação e invariante; 400 `INVALID_CATEGORY_HIERARCHY` (RN032) ou `INCOMPATIBLE_CATEGORY_NATURE` (RN033); 404 categoria pai não encontrada ou de outro dono; 401 sem token |
| `PATCH /categories/:id/archive` | `ArchiveCategoryController` | `ArchiveCategoryUseCase` | 200; 404 categoria não encontrada ou de outro dono; 401 sem token |
| `PATCH /categories/:id/unarchive` | `UnarchiveCategoryController` | `UnarchiveCategoryUseCase` | 200; 404 categoria não encontrada ou de outro dono; 401 sem token |
| `DELETE /categories/:id` | `DeleteCategoryController` | `DeleteCategoryUseCase` | 204; 403 `NOT_ALLOWED` com subcategoria vinculada (RN034); 404 categoria não encontrada ou de outro dono; 401 sem token |

## Ainda não existe

| Operação | RN | O que a destrava |
| -------- | -- | ---------------- |
| Editar e mover categoria (SCRUM-47) | RN032, RN033 | Métodos de mutação na entidade — já existe o padrão (`archive`/`unarchive`/`touch` privado) para seguir; reaproveita `validateSubcategoryHierarchy`, mas falta a checagem de auto-referência e de "pai que já tem filhas não pode virar subcategoria", que só fazem sentido movendo um registro existente; falta também a leitura de filhas no repositório |
| Listagem em árvore (SCRUM-48) | RN031, RN035, RN084 | `parent_id` e `archived_at` já existem; falta a consulta em árvore (montada de uma vez no repositório Drizzle) com o filtro de arquivadas — por padrão omitidas, opcionalmente incluídas — e a exclusão de subcategoria de pai arquivado (RN084) |
| Bloqueio de exclusão por vínculo de transação | RN034 | `DeleteCategoryUseCase` só verifica subcategoria; falta comparar com o contexto de _Transações_, que ainda não existe |
| Consulta individual | RN029 | Nada — é só implementar |

## Onde tocar

**Campo novo na categoria** → entidade (`Category`, com a invariante) → `schemas/categories.ts` → `make -C server db-generate NAME=<nome>` → `DrizzleCategoryMapper` nos dois sentidos → schema Zod do controller → `CategoryPresenter` → `test/factories/make-category.ts` → specs.

**Operação nova** → caso de uso em `application/use-cases/` → método novo na porta `CategoriesRepository` → implementar nos **dois** repositórios (Drizzle e in-memory) → controller → registrar em `HttpModule` com `useFactory` + `inject` → presenter → spec unitário e e2e.

**Natureza nova** → `CATEGORY_NATURES` → constante na entidade → enum no schema Drizzle **e migration** → e revisar a compatibilidade que a RN033 e a RN042 exigem, porque uma natureza nova muda o que é aceito como subcategoria e como transação.

**Validar hierarquia ou natureza de um vínculo pai/filha** → chame `validateSubcategoryHierarchy(parent, childNature)` em vez de reescrever RN032/RN033; ela não sabe de `ownerId` nem faz I/O, então quem chama já precisa ter buscado o pai e verificado o dono antes.

**Erro de negócio "bloqueado por vínculo existente"** → use `NotAllowedError` (`@core/errors/not-allowed-error`, 403), como em `DeleteCategoryUseCase`, em vez de criar um erro específico do contexto — ele já existe para exatamente esse caso e não tem código registrado em nenhum outro lugar.
