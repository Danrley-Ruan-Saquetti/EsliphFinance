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

> Estado atual do repositório: o projeto está no esqueleto inicial do Nest. Drizzle, driver do Postgres e autenticação ainda **não** foram adicionados — o que está descrito abaixo é a arquitetura-alvo a ser seguida conforme o código for crescendo.

## Ambiente Docker

O `docker-compose.yml` define dois serviços na rede `esliph-network`:

- **`workspace`** — `node:22-bookworm` com o projeto montado em `/workspace`. Fica ocioso (`tail -f /dev/null`) e é onde todo comando de desenvolvimento roda. Depende do `database` estar saudável e recebe a `DATABASE_URL` já apontando para ele.
- **`database`** — `postgres:17-alpine`, com healthcheck via `pg_isready` e dados persistidos no volume nomeado `postgres-data`. Exposto na porta `${POSTGRES_PORT:-5432}` do host para clientes externos.

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
make test                     # suíte completa
make test-watch               # vitest em watch
make test-cov                 # com relatório de cobertura
make test-file FILE=<caminho|padrão>  # um arquivo
make test-name NAME="<nome>"  # um caso isolado
make lint                     # eslint --fix
make format                   # prettier --write
make typecheck                # tsc --noEmit
make check                    # typecheck + lint + test
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
make db-reset  # recria o banco do zero (APAGA os dados)
make db-dump DUMP=<caminho>     # pg_dump (padrão: .tmp/backup.sql)
make db-restore DUMP=<caminho>  # importa um dump
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
    errors/                      #   erros base de domínio/aplicação
    either.ts                    #   retorno explícito de sucesso/erro dos use-cases

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
    database/drizzle/
      schemas/                   # definição das tabelas (drizzle)
      mappers/                   # domínio <-> persistência
      repositories/              # implementações das interfaces de application/repositories
      migrations/
    http/
      controllers/               # finos: traduzem HTTP <-> use-case, nunca contêm regra
      pipes/                     # ZodValidationPipe
      presenters/                # domínio -> JSON de resposta
    auth/                        # JWT, guards, estratégias (RNF005)
    cryptography/                # implementações de hash/JWT
    env/                         # schema Zod das variáveis de ambiente
    <contexto>.module.ts         # wiring do Nest: liga porta -> implementação

test/                            # factories e repositórios in-memory
```

### Convenções

- **Contextos** derivam dos requisitos: usuários/autenticação, grupos de ativos, ativos, cartões de débito, categorias, tags, transações, faturas, orçamentos, metas, lançamentos favoritos, anexos, relatórios e notificações.
- **Casos de uso** expõem um único método `execute(request)` e retornam `Either<Erro, Sucesso>` — erros esperados de negócio são valor de retorno, não exceção.
- **Repositórios** são declarados como classe abstrata / interface em `domain/<ctx>/application/repositories` e registrados no módulo Nest apontando para a implementação Drizzle. O uso de `Repository` no use-case é sempre pelo tipo abstrato.
- **Zod** valida nas bordas: corpo/query/params HTTP (via `ZodValidationPipe`) e variáveis de ambiente. A validação de entrada não substitui as invariantes do domínio, que ficam nas entidades.
- **Dinheiro** é encapsulado em um Value Object `Money` sobre inteiro em centavos; nunca `float`, nem em coluna do banco.
- **Propriedade do registro** é verificada dentro do caso de uso, não por filtro implícito no repositório: buscar o registro e comparar o dono antes de ler ou alterar.
- **Exclusões** são majoritariamente lógicas ou bloqueadas por vínculos — conferir a RN correspondente antes de implementar um delete.
- **Path aliases**: `@*` → `src/*`, `@tests` → `test/*`.

## Testes

- **Unitários** ficam ao lado do arquivo testado (`*.spec.ts`) e cobrem entidades e casos de uso usando **repositórios in-memory**, sem Docker de banco e sem NestJS.
- **E2E** ficam em `test/` (`*.e2e-spec.ts`), sobem a aplicação Nest e batem no serviço `database`. Preferir um schema isolado por execução para não sujar o banco de desenvolvimento.
- Coverage está habilitado por padrão no `vitest.config.js`, então qualquer execução grava em `coverage/`.
- Casos de uso novos entram com teste unitário; o teste deve referenciar a RN que implementa.

```sh
make test                             # suíte completa
make test-file FILE=<caminho|padrão>  # um arquivo
make test-name NAME="<nome>"          # um caso isolado
make test-cov                         # com relatório de cobertura
```

## Estilo

- Prettier: sem ponto e vírgula, aspas simples, `printWidth` 160, `arrowParens: avoid`, indentação de 2 espaços (`.prettierrc`).
- ESLint com `typescript-eslint` + integração Prettier (`eslint.config.mjs`).
