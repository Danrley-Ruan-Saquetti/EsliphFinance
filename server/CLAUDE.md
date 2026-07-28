# EsliphFinance — Server

API do EsliphFinance. Este documento cobre apenas o backend; o contexto geral do repositório (domínio, requisitos, convenções de idioma e commits) está no `CLAUDE.md` da raiz, e as regras de negócio em `../docs/requirements.md`.

## Stack

| Camada           | Tecnologia                         |
| ---------------- | ---------------------------------- |
| Runtime          | Node 22                            |
| Framework        | NestJS 11                          |
| Banco            | PostgreSQL                         |
| ORM / Migrations | Drizzle ORM + Drizzle Kit          |
| Validação        | Zod                                |
| Testes           | Vitest (+ coverage v8) / Supertest |
| Ambiente         | Docker + Docker Compose            |
| Comandos         | Makefile                           |

> Estado atual do repositório: a fundação arquitetural está implementada (camadas, `core/`, pipe global de validação, padrão `Either`, aliases), a persistência com Drizzle e o pipeline de migrations estão no ar, e há um **módulo de exemplo** em `src/domain/example` servindo de referência de estrutura — ele não faz parte do domínio real. Autenticação ainda **não** foi adicionada; o que depende dela está marcado abaixo.

## Ambiente Docker

O `docker-compose.yml` define três serviços na rede `esliph-network`:

- **`workspace`** — `node:22-bookworm` com o projeto montado em `/workspace`. Fica ocioso (`tail -f /dev/null`) e é onde todo comando de desenvolvimento roda. Depende do `database` estar saudável e recebe a `DATABASE_URL` já apontando para ele.
- **`database`** — `postgres:17-alpine`, com healthcheck via `pg_isready` e dados persistidos no volume nomeado `postgres-data`. Exposto na porta `${POSTGRES_PORT:-5432}` do host para clientes externos.
- **`migrate`** — serviço de tarefa no perfil `migration` (não sobe com `make up`). Aplica as migrations pendentes com o Drizzle Kit depois que o `database` fica saudável; é o que `make db-migrate` executa.

Dentro da rede do Compose o host do banco é o nome do serviço: **`database`**, não `localhost`. A `DATABASE_URL` usada pela aplicação é, por padrão:

```
postgresql://postgres:postgres@database:5432/esliph_finance
```

As credenciais vêm de variáveis interpoladas (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`) com defaults de desenvolvimento, então o ambiente sobe sem configuração nenhuma. Para sobrescrever, copie `.env.example` para `.env` — o Compose lê esse arquivo automaticamente.

## Execução — sempre via Docker + Makefile

**Nunca rodar `npm`/`node`/`npx` direto na máquina host.** Tudo executa dentro do container `workspace`, e todo comando é centralizado no `Makefile`.

`make` sem argumento (ou `make help`) imprime a lista completa de alvos — é o índice canônico e deve ser mantido em dia quando um alvo novo entrar.

**Dependências**

```sh
make deps                  # npm install
make deps-ci               # npm ci (a partir do lockfile)
make add PKG=<pacote>      # npm install <pacote>
make add-dev PKG=<pacote>  # npm install -D <pacote>
```

**Aplicação**

```sh
make dev                      # start:dev (watch)
make start                    # start (sem watch)
make debug                    # start:debug (watch + inspector)
make build                    # nest build
make prod                     # node dist/main
make nest ARGS="g module user"  # Nest CLI
```

**Qualidade**

```sh
make test                     # testes unitários
make test-watch               # vitest em watch
make test-e2e                 # testes end-to-end
make test-cov                 # com relatório de cobertura
make test-file FILE=<caminho|padrão>  # um arquivo
make test-name NAME="<nome>"  # um caso isolado
make lint                     # eslint --fix
make format                   # prettier --write
make typecheck                # tsc --noEmit
make check                    # typecheck + lint + testes
```

**Ambiente e banco**

```sh
make up        # sobe todos os serviços em background
make down      # derruba os containers (o volume de dados é preservado)
make restart   # down + up
make ps        # status dos serviços
make logs      # logs de todos os serviços
make cli       # shell bash dentro do container
make clean     # derruba os containers E APAGA os volumes

make db        # sobe apenas o Postgres em background
make db-cli    # psql conectado ao banco
make db-logs   # logs do Postgres
make db-reset  # recria o banco do zero e aplica as migrations (APAGA os dados)
make db-dump DUMP=<caminho>     # pg_dump (padrão: .tmp/backup.sql)
make db-restore DUMP=<caminho>  # importa um dump

make db-generate NAME=<nome>  # gera a migration a partir do schema Drizzle
make db-migrate               # aplica as migrations pendentes
make db-check                 # verifica conflitos entre as migrations
make db-studio                # Drizzle Studio em http://localhost:4983
```

`clean` e `db-reset` destroem o volume `postgres-data` — use só quando a perda dos dados de desenvolvimento for intencional.

Ao precisar de um comando novo (migrations, geração de schema...), **adicione um alvo no `Makefile`** no mesmo formato (`docker compose run --rm workspace <cmd>` + `.PHONY`), na seção correspondente e com a linha equivalente no alvo `help`, em vez de instruir o usuário a rodar o comando cru.

## Arquitetura — DDD + Clean Architecture

A regra fundamental é a **regra de dependência**: as setas apontam sempre para dentro. O domínio não conhece ninguém; a aplicação conhece o domínio; a infraestrutura conhece as duas e implementa as portas que elas declaram. NestJS, Drizzle, Express e Zod são detalhes de infraestrutura e **não podem vazar** para dentro do domínio (nada de `@Injectable()`, imports de `drizzle-orm` ou tipos de `express` em entidades ou casos de uso).

```
Infra (HTTP, Drizzle, Auth, Env)  →  Application (use-cases, ports)  →  Domain (entidades, VOs)
```

### Estrutura de pastas

```
src/
  core/                          # blocos de construção compartilhados, sem regra de negócio
    entities/                    #   Entity, AggregateRoot, UniqueEntityID
    value-objects/               #   ValueObject base, Money (centavos — RNF004)
    errors/                      #   BaseError e erros genéricos de aplicação
    events/                      #   contrato de evento de domínio
    types/                       #   utilitários de tipo (Optional)
    either.ts                    #   retorno explícito de sucesso/erro dos use-cases
    use-case.ts                  #   contrato dos use-cases

  domain/
    <contexto>/                  # user, asset, transaction, invoice, budget, goal, ...
      enterprise/
        entities/                #   entidades e agregados — regras invariantes do negócio
        value-objects/
        events/
      application/
        use-cases/               #   um caso de uso por arquivo, uma responsabilidade
        repositories/            #   INTERFACES dos repositórios (portas)
        services/                #   portas de serviços externos (hasher, criptografia...)

  infra/
    database/
      drizzle/
        schemas/                 #   tabelas Drizzle — fonte das migrations
        mappers/                 #   registro do banco <-> entidade
        repositories/            #   implementações Drizzle das portas
        migrations/              #   SQL versionado gerado pelo Drizzle Kit
        drizzle.service.ts       #   pool `pg` no ciclo de vida do Nest
      in-memory/                 # implementações em memória das portas
      database.module.ts         # wiring do Nest: liga porta -> implementação
    http/
      controllers/               # finos: traduzem HTTP <-> use-case, nunca contêm regra
      pipes/                     # ZodValidationPipe (por rota, schema no construtor)
      presenters/                # domínio -> JSON de resposta
      http.module.ts             # controllers + instanciação dos use-cases
    auth/                        # JWT, guards, estratégias (RNF005)
    cryptography/                # implementações de hash/JWT
    env/                         # schema Zod das variáveis de ambiente + EnvService

  app.module.ts                  # raiz: agrega os módulos e o que é transversal
  main.ts

test/
  units/                         # testes unitários, espelhando o caminho em src/
  e2e/                           # testes end-to-end, espelhando o caminho em src/
  factories/                     # construtores de entidade para os testes
```

`src/domain/example` (entidade `Note`) e os arquivos correspondentes em `src/infra` são o **módulo de exemplo**: uma fatia vertical completa que serve de modelo ao criar um contexto novo. Não é domínio real e deve sair quando deixar de ser útil como referência.

### Convenções

- **Contextos** derivam dos requisitos: usuários/autenticação, grupos de ativos, ativos, cartões de débito, categorias, tags, transações, faturas, orçamentos, metas, lançamentos favoritos, anexos, relatórios e notificações.
- **Casos de uso** implementam `UseCase<Request, Response>` (`@core/use-case`): um único método `execute(request)` que retorna `Either<Erro, Sucesso>` — erros esperados de negócio são valor de retorno, não exceção. Exceção fica para falha inesperada e para invariante de domínio violada (`InvariantError`, lançado pela entidade).
- **Erros** herdam de `BaseError` (`@core/errors/base-error`) e expõem um `code` estável; a tradução para status HTTP acontece na infraestrutura, nunca dentro do caso de uso.
- **Casos de uso não recebem `@Injectable()`**: são registrados nos módulos Nest com `useFactory` + `inject`, o que mantém a aplicação livre do framework.
- **Repositórios** são declarados como classe abstrata em `domain/<ctx>/application/repositories` (a classe abstrata também é o token de injeção) e ligados à implementação em `infra/database/database.module.ts`. O uso no caso de uso é sempre pelo tipo abstrato.
- **Persistência** passa por `DrizzleService`, o único dono do pool `pg`: ele abre a conexão no `onModuleInit` e a encerra no `onApplicationShutdown`. Nenhum outro arquivo instancia `Pool` ou chama `drizzle()`.
- **Schema do banco** vive em `infra/database/drizzle/schemas/` e é a fonte das migrations — alterar tabela é editar o schema e rodar `make db-generate NAME=<nome>`, nunca DDL manual nem edição do SQL já aplicado. Esses arquivos usam import relativo entre irmãos, porque o Drizzle Kit os lê fora do build do Nest e não resolve os path aliases.
- **Mapper** por agregado (`DrizzleNoteMapper`) traduz registro do banco ↔ entidade; o repositório não monta entidade à mão e a entidade não conhece a tabela.
- **Zod** valida nas bordas: corpo/query/params HTTP e variáveis de ambiente. O `ZodValidationPipe` (`@infra/http/pipes/zod-validation-pipe`) recebe o schema no construtor e é aplicado por rota, no parâmetro — `@Body(new ZodValidationPipe(schema)) body: z.infer<typeof schema>` —, então um controller pode ter quantos schemas precisar. A validação de entrada não substitui as invariantes do domínio, que ficam nas entidades.
- **Dinheiro** é encapsulado em um Value Object `Money` sobre inteiro em centavos; nunca `float`, nem em coluna do banco.
- **Propriedade do registro** é verificada dentro do caso de uso, não por filtro implícito no repositório: buscar o registro e comparar o dono antes de ler ou alterar.
- **Exclusões** são majoritariamente lógicas ou bloqueadas por vínculos — conferir a RN correspondente antes de implementar um delete.
- **Nomenclatura**: arquivos em kebab-case com sufixo de papel (`create-note.ts`, `notes-repository.ts`, `create-note.controller.ts`, `note-presenter.ts`, `http.module.ts`); um artefato por arquivo, com o nome do arquivo espelhando o do artefato; contextos no singular, repositórios no plural do agregado.
- **Path aliases**: `@*` → `src/*`, `@tests/*` → `test/*`. Import relativo só entre arquivos irmãos da mesma pasta.

## Testes

- Todo teste vive em `test/` — nada de `*.spec.ts` dentro de `src/`.
- São **duas configurações do Vitest**: `vitest.config.js` coleta `test/units/**/*.spec.ts` (unitários) e `vitest.config.e2e.js` coleta `test/e2e/**/*.e2e-spec.ts` (e2e). Um arquivo fora desses padrões não é executado por ninguém.
- **Unitários** ficam em `test/units/` **no mesmo caminho do arquivo testado em `src/`** (`src/domain/example/application/use-cases/create-note.ts` → `test/units/domain/example/application/use-cases/create-note.spec.ts`) e cobrem entidades e casos de uso usando **repositórios in-memory**, sem Docker de banco e sem NestJS.
- **E2E** ficam em `test/e2e/` **no mesmo caminho do arquivo testado em `src/`** — normalmente o controller (`src/infra/http/controllers/get-note.controller.ts` → `test/e2e/infra/http/controllers/get-note.controller.e2e-spec.ts`), um arquivo por controller. Sobem a aplicação Nest e batem no serviço `database` com as migrations já aplicadas (`make db-migrate`). Cada spec limpa no `beforeAll` as tabelas que usa, via `app.get(DrizzleService)`, e os arquivos rodam em série (`fileParallelism: false`) porque compartilham o mesmo banco.
- **Factories** ficam em `test/factories/make-<entidade>.ts`, com assinatura `(override = {}, id?)`, e são a forma padrão de montar entidade em spec — exceto no spec da própria entidade, onde a construção é o que está sob teste.
- Coverage está habilitado por padrão nos unitários, então qualquer execução grava em `coverage/`. A meta é **100% dos arquivos testáveis**, com o `vitest.config.js` reprovando abaixo de **85%**; ficam fora da conta o bootstrap, os módulos Nest, o `DrizzleService`, os repositórios e schemas Drizzle e os repositórios in-memory.
- Casos de uso novos entram com teste unitário; o teste deve referenciar a RN que implementa.
- A skill `spec-writer` (em `.claude/skills/`) traz o padrão completo de escrita dos specs, a lista de edge cases do domínio e o checklist.
- No CI (`.github/workflows/server-tests.yml`) os testes rodam **sem Docker**: Node 22 via `actions/setup-node` e os scripts npm direto (`npm ci`, `npm test`, `npm run db:migrate`, `npm run test:e2e`), com o Postgres subindo como *service container* do GitHub Actions em `localhost:5432`. O `Makefile` continua sendo o caminho do desenvolvimento local; ao criar um alvo novo que o CI precise, adicione o script npm equivalente ao workflow. Roda a cada push e pull request para `main` e `develop` que toque em `server/`.

```sh
make test                             # unitários
make test-e2e                         # end-to-end
make test-file FILE=<caminho|padrão>  # um arquivo
make test-name NAME="<nome>"          # um caso isolado
make test-cov                         # com relatório de cobertura
```

## Estilo

- Prettier: sem ponto e vírgula, aspas simples, `printWidth` 160, `arrowParens: avoid`, indentação de 2 espaços (`.prettierrc`).
- ESLint com `typescript-eslint` + integração Prettier (`eslint.config.mjs`).
