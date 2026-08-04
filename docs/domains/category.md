# Categorias

> **Contexto** `server/src/domain/category` · **Requisitos** RF006 · RN029–RN035

A _Categoria_ classifica receitas e despesas do usuário. O que a distingue de um rótulo qualquer é a **natureza**: "Receita", "Despesa" ou "Ambas" (RN030), que mais tarde decide quais _Transações_ podem usá-la (RN042) e quais subcategorias podem pendurar-se nela (RN033).

Hoje o contexto tem só o cadastro raiz (SCRUM-45). Hierarquia, edição, listagem em árvore e arquivamento estão especificados mas não existem em código — ver "Ainda não existe". A tabela nasceu sem `parent_id` e sem `archived_at` de propósito: cada uma entra pela migration da história que a implementar, como foi com `accounts` (`0006` e `0007`).

## Mapa dos arquivos

| Artefato | Caminho (a partir de `server/`) | O que só ele sabe |
| -------- | ------------------------------- | ----------------- |
| `Category` (agregado) | `src/domain/category/enterprise/entities/category.ts` | Nome não vazio de até 120 caracteres, ícone em kebab-case normalizado para minúsculas, cor `#RRGGBB` normalizada para maiúsculas e natureza dentro do domínio (RN029, RN030). Não tem método de mutação — nem renomear, nem mover, nem arquivar. Expõe `INCOME_NATURE`, `EXPENSE_NATURE` e `BOTH_NATURE`, e é por essas constantes que os outros contextos comparam a natureza, nunca por literal. |
| `CategoryNature` | `src/domain/category/enterprise/value-objects/category-nature.ts` | União de tipos sobre `CATEGORY_NATURES`, não uma classe — mesma forma de `AccountGroupType`. É o vocabulário compartilhado com o schema Zod da rota e, no futuro, com _Transações_. |
| `CategoriesRepository` (porta) | `src/domain/category/application/repositories/categories-repository.ts` | Só `create`. Leitura ainda não é necessária porque nenhuma operação do contexto lê categoria. |
| `CreateCategoryUseCase` | `src/domain/category/application/use-cases/create-category.ts` | `Either<never, ...>` — não tem caminho de erro; o que pode falhar é invariante da entidade. Diferente de `CreateAccountUseCase`, não carrega nada antes de criar: sem categoria pai, não há registro alheio a checar. |
| Tabela `categories` | `src/infra/database/drizzle/schemas/categories.ts` | Enum `category_nature` no Postgres; índice por dono. |
| `DrizzleCategoryMapper` | `src/infra/database/drizzle/mappers/drizzle-category-mapper.ts` | Tradução direta registro ↔ entidade. |
| `DrizzleCategoriesRepository` | `src/infra/database/drizzle/repositories/drizzle-categories-repository.ts` | Insert simples. |
| `InMemoryCategoriesRepository` | `src/infra/database/in-memory/in-memory-categories-repository.ts` | Sem dependência de outro repositório — o spec monta um objeto só. |
| `CreateCategoryController` | `src/infra/http/controllers/create-category.controller.ts` | Schema Zod do corpo: os quatro campos são obrigatórios, e a natureza é validada contra `CATEGORY_NATURES`. |
| `CategoryPresenter` | `src/infra/http/presenters/category-presenter.ts` | `toHTTP` — resposta sem `ownerId`, como nos demais contextos. |

## Regras que o código garante

| RN | Onde é aplicada | Como falha |
| -- | --------------- | ---------- |
| RN029 | `Category.create` (nome, ícone, cor) + schema Zod de `CreateCategoryController` | Nome vazio ou acima de 120 caracteres, ícone fora do kebab-case ou acima de 60 caracteres, cor fora de `#RRGGBB` → `InvariantError` (422); pela borda HTTP o erro sai antes, como `VALIDATION_FAILED` com `details[].field`. **Nenhum dos quatro campos tem default**: a RN029 não prevê nenhum, ao contrário da RN016 e da RN018, que dizem explicitamente o valor assumido. É a diferença em relação a `Account`, onde o ícone é opcional. |
| RN030 | `CATEGORY_NATURES`, enum `category_nature` no banco, schema Zod da rota e `Category.validateNature` | Natureza fora do domínio → 422 pelo `ZodValidationPipe`; chegando por mapper ou caso de uso futuro, `InvariantError`. Os valores persistidos são `INCOME`, `EXPENSE` e `BOTH` |
| RN031–RN035 | **Não implementadas.** Sem coluna, sem caso de uso e sem rota | — |
| RN010, RN011 | `CreateCategoryUseCase` | O `ownerId` nunca vem do cliente: sai do `@CurrentUser()` e é aplicado depois do corpo (`{ ...body, ownerId: currentUser.id }`), então `ownerId` forjado no JSON é ignorado |

## Fronteiras

| Domínio | Direção | Ponto de contato | O que rege |
| ------- | ------- | ---------------- | ---------- |
| [Usuários](user.md) | Categoria → Usuário | `Category.ownerId`, vindo do token; FK `categories.owner_id` | RN010, RN011 |
| Categoria → Categoria _(não existe)_ | Subcategoria → Categoria | Vai ser `parent_id` na mesma tabela, com a validação de profundidade e de natureza no caso de uso | RN031, RN032, RN033 |
| Transações _(não existe)_ | Transação → Categoria | Vai comparar a natureza com o tipo da transação e bloquear a exclusão da categoria | RN034, RN042 |

Hoje o contexto não importa nem é importado por nenhum outro domínio — é a fatia mais isolada do backend.

## Persistência

Tabela `categories`, criada pela migration `0008_create_categories_table`.

| Coluna | Observação |
| ------ | ---------- |
| `owner_id` | FK para `users`, indexada por `categories_owner_id_index` |
| `name` | `varchar(120)` |
| `nature` | Enum `category_nature` do Postgres — valor novo exige migration, não é `varchar` livre |
| `icon` | `varchar(60)`, guardado em minúsculas |
| `color` | `char(7)`, guardada em maiúsculas |

## Contrato HTTP

| Rota | Controller | Caso de uso | Respostas |
| ---- | ---------- | ----------- | --------- |
| `POST /categories` | `CreateCategoryController` | `CreateCategoryUseCase` | 201; 422 validação e invariante; 401 sem token |

## Ainda não existe

| Operação | RN | O que a destrava |
| -------- | -- | ---------------- |
| Vincular subcategoria (SCRUM-46) | RN031, RN032, RN033 | Coluna `parent_id` + migration, `findById` na porta e a validação de profundidade e de natureza no caso de uso |
| Editar e mover categoria (SCRUM-47) | RN032, RN033 | Métodos de mutação na entidade (ela é imutável hoje) e as leituras de pai e de filhas no repositório |
| Listagem em árvore (SCRUM-48) | RN031, RN035 | Depende da hierarquia; a montagem da árvore é uma consulta só, no repositório Drizzle |
| Arquivar, desarquivar e excluir (SCRUM-49) | RN034, RN035 | Coluna `archived_at` + migration; a exclusão ainda depende do contexto de _Transações_ para o bloqueio por vínculo |
| Consulta individual | RN029 | Nada — é só implementar |

## Onde tocar

**Campo novo na categoria** → entidade (`Category`, com a invariante) → `schemas/categories.ts` → `make -C server db-generate NAME=<nome>` → `DrizzleCategoryMapper` nos dois sentidos → schema Zod do controller → `CategoryPresenter` → `test/factories/make-category.ts` → specs.

**Operação nova** → caso de uso em `application/use-cases/` → método novo na porta `CategoriesRepository` → implementar nos **dois** repositórios (Drizzle e in-memory) → controller → registrar em `HttpModule` com `useFactory` + `inject` → presenter → spec unitário e e2e.

**Natureza nova** → `CATEGORY_NATURES` → constante na entidade → enum no schema Drizzle **e migration** → e revisar a compatibilidade que a RN033 e a RN042 exigem, porque uma natureza nova muda o que é aceito como subcategoria e como transação.
