# Persistência

> **Cobre** `server/src/infra/database` e `server/drizzle.config.ts` · **Requisitos** RNF-0003 · RNF-0004

Como o banco é acessado, como uma tabela nasce e como a entidade atravessa a fronteira do armazenamento. O conteúdo de cada tabela é do contexto que a possui, e volta a ser documentado em `docs/domains/` quando a fatia de domínio voltar.

## `DrizzleService` — o dono único da conexão

`DrizzleService` é o único arquivo que instancia `Pool` e chama `drizzle()`. Nenhum repositório abre conexão; todos recebem o serviço e usam `drizzleService.db`.

| Momento | O que faz |
| ------- | --------- |
| Construtor | Cria o `Pool` com `DATABASE_URL`, `DATABASE_POOL_MAX` e SSL — com `DATABASE_SSL` ligado, exige certificado válido (`rejectUnauthorized: true`), que é o modo esperado da instância gerenciada em nuvem (RNF-0003) |
| `onModuleInit` | Pega e devolve uma conexão imediatamente, para a aplicação falhar no start em vez de na primeira requisição |
| `onApplicationShutdown` | Encerra o pool — só roda porque `main.ts` chama `enableShutdownHooks()` |

O `db` é tipado com o schema inteiro (`NodePgDatabase<typeof schema>`), então a consulta conhece as colunas em tempo de compilação.

## Schema, migrations e o barril

O schema Drizzle em `infra/database/drizzle/schemas/` é a **fonte** das migrations. Alterar tabela é editar o schema e gerar a migration; nunca DDL manual, e **nunca editar SQL já aplicado** — o Drizzle Kit mantém `migrations/meta/_journal.json` e snapshots por versão, e mexer no passado desalinha os dois.

Três detalhes que custam caro descobrir:

- **Os arquivos de schema importam os irmãos por caminho relativo** (`from './users'`), não pelo alias `@infra/...`. É deliberado: o Drizzle Kit lê esses arquivos fora do build do Nest, por `drizzle.config.ts`, e não resolve os path aliases do `tsconfig`. Um alias aqui quebra a geração de migration sem quebrar a aplicação.
- **`schemas/index.ts` é um barril e tem função de runtime.** É o `schema` que o `drizzle.config.ts` aponta, é o que tipa o `db`, e é o que o helper de teste `cleanDatabase` varre com `isTable` para truncar tudo com `RESTART IDENTITY CASCADE`. Consequência: **tabela nova é limpa sozinha nos testes assim que entra no barril** — e tabela que ficar de fora não é gerada nem limpa.
- **`drizzle.config.ts` lê `process.env` direto**, com `dotenv/config`, e é a única exceção legítima à regra de que toda variável passa pelo `EnvService`. Ele roda antes e fora do Nest. Ver [`configuration.md`](configuration.md).

Coluna monetária usa sempre o helper `moneyAmount(name)` — `bigint` com `mode: 'number'` (RNF-0004). Ver [`core-building-blocks.md`](core-building-blocks.md).

## Mappers

Um mapper por agregado, com dois estáticos e nenhum estado:

| Direção | Método | Tipo |
| ------- | ------ | ---- |
| Registro → entidade | `toDomain(record)` | `typeof tabela.$inferSelect` |
| Entidade → registro | `toPersistence(entity)` | `typeof tabela.$inferInsert` |

Os tipos saem da própria tabela por inferência, então mudar uma coluna quebra o mapper em tempo de compilação — que é exatamente onde se quer descobrir. O repositório não monta entidade à mão e a entidade não conhece a tabela.

`toDomain` reconstrói pelo factory `create` da entidade passando o `id` existente; `toPersistence` normaliza os opcionais (`?? null`), porque o domínio usa `undefined` e a coluna usa `NULL`.

## Repositórios

A porta é uma **classe abstrata** declarada no domínio, e é também o token de injeção. Há duas implementações de cada uma:

| Implementação | Onde | Quando é usada |
| ------------- | ---- | -------------- |
| `Drizzle*Repository` | `drizzle/repositories/` | Produção — ligada à porta no `DatabaseModule` |
| `InMemory*Repository` | `in-memory/` | Testes unitários — montada à mão no spec, **não registrada em módulo nenhum** |

As duas `extends` a classe abstrata (não `implements`), o que faz o compilador cobrar a assinatura completa em ambas.

O in-memory não é um detalhe do teste: ele é o segundo implementador de cada porta, e é o que denuncia quando uma porta está pedindo demais. Ele também carrega acoplamento próprio — `InMemoryAccountsRepository` recebe `InMemoryAccountGroupsRepository` no construtor para conseguir filtrar por tipo de grupo, e quem não souber disso não monta o spec. Onde a consulta Drizzle faz junção, o in-memory precisa de acesso ao repositório vizinho.

Ordenação e filtros fazem parte do contrato da porta e precisam bater nas duas implementações — uma listagem ordenada por nome no SQL e não ordenada no in-memory passa no unitário e falha no e2e.

## Onde tocar

| Mudança | Passos |
| ------- | ------ |
| Coluna nova | Schema Drizzle → gerar migration → mapper (`toDomain` e `toPersistence`) → entidade |
| Tabela nova | Arquivo de schema com imports relativos → `export *` no `schemas/index.ts` → gerar migration → mapper → porta → implementação Drizzle e in-memory → ligação no `DatabaseModule` |
| Consulta nova | Método na porta abstrata → implementar nos **dois** repositórios |

## Ainda não existe

| Ausente | Consequência |
| ------- | ------------ |
| Transação atravessando repositórios | Operação que escreve em duas tabelas não é atômica |
| Paginação nas portas de listagem | `findMany*` devolve tudo do dono |
| Soft delete padronizado | Cada contexto resolve exclusão à sua maneira (arquivamento em contas, por exemplo) |
| Índice revisado por consulta | Os índices existentes acompanharam a criação das tabelas, sem revisão por plano de execução |
