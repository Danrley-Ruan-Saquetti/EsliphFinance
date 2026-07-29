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
        schemas/                 #   tabelas Drizzle — fonte das migrations; `moneyAmount` para coluna monetária
        mappers/                 #   registro do banco <-> entidade
        repositories/            #   implementações Drizzle das portas
        migrations/              #   SQL versionado gerado pelo Drizzle Kit
        drizzle.service.ts       #   pool `pg` no ciclo de vida do Nest
      in-memory/                 # implementações em memória das portas
      database.module.ts         # wiring do Nest: liga porta -> implementação
    http/
      controllers/               # finos: traduzem HTTP <-> use-case, nunca contêm regra
      errors/                    #   contrato de erro da API e mapa código -> status HTTP
      filters/                   #   AllExceptionsFilter: exceção -> resposta de erro padrão
      middlewares/               #   CORS, headers de segurança, HTTPS e correlação de requisição
      pipes/                     # ZodValidationPipe (por rota, schema no construtor)
      presenters/                # domínio -> JSON de resposta
      schemas/                   # schemas Zod reutilizáveis de entrada (moneySchema)
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
- **Erros** herdam de `BaseError` (`@core/errors/base-error`), expõem um `code` estável em inglês e carregam a mensagem em português (ver [Idioma das mensagens](#idioma-das-mensagens)); a tradução para status HTTP acontece na infraestrutura, nunca dentro do caso de uso — nem no controller, que apenas lança o erro do `Either` e deixa o filtro global responder (ver [Contrato de erro da API](#contrato-de-erro-da-api)).
- **Casos de uso não recebem `@Injectable()`**: são registrados nos módulos Nest com `useFactory` + `inject`, o que mantém a aplicação livre do framework.
- **Repositórios** são declarados como classe abstrata em `domain/<ctx>/application/repositories` (a classe abstrata também é o token de injeção) e ligados à implementação em `infra/database/database.module.ts`. O uso no caso de uso é sempre pelo tipo abstrato.
- **Persistência** passa por `DrizzleService`, o único dono do pool `pg`: ele abre a conexão no `onModuleInit` e a encerra no `onApplicationShutdown`. Nenhum outro arquivo instancia `Pool` ou chama `drizzle()`.
- **Schema do banco** vive em `infra/database/drizzle/schemas/` e é a fonte das migrations — alterar tabela é editar o schema e rodar `make db-generate NAME=<nome>`, nunca DDL manual nem edição do SQL já aplicado. Esses arquivos usam import relativo entre irmãos, porque o Drizzle Kit os lê fora do build do Nest e não resolve os path aliases.
- **Mapper** por agregado (`DrizzleNoteMapper`) traduz registro do banco ↔ entidade; o repositório não monta entidade à mão e a entidade não conhece a tabela.
- **Configuração** vive inteira em `infra/env`: `envSchema` (Zod) declara toda variável, `validateEnv` roda no bootstrap pelo `ConfigModule` e derruba a aplicação com a lista de variáveis ausentes ou inválidas, e o `EnvService` é a única forma de ler uma variável — nada de `process.env` espalhado. Variável nova entra no schema, no `.env.example` e no `docker-compose.yml`, junto (ver [Configuração e segurança de transporte](#configuração-e-segurança-de-transporte)).
- **Zod** valida nas bordas: corpo/query/params HTTP e variáveis de ambiente. O `ZodValidationPipe` (`@infra/http/pipes/zod-validation-pipe`) recebe o schema no construtor, valida com o locale português do Zod e é aplicado por rota, no parâmetro — `@Body(new ZodValidationPipe(schema)) body: z.infer<typeof schema>` —, então um controller pode ter quantos schemas precisar. A validação de entrada não substitui as invariantes do domínio, que ficam nas entidades.
- **Dinheiro** é encapsulado no Value Object `Money` sobre inteiro em centavos; nunca `float`, nem em coluna do banco (ver [Valores monetários](#valores-monetários)).
- **Propriedade do registro** é verificada dentro do caso de uso, não por filtro implícito no repositório: buscar o registro e comparar o dono antes de ler ou alterar.
- **Exclusões** são majoritariamente lógicas ou bloqueadas por vínculos — conferir a RN correspondente antes de implementar um delete.
- **Nomenclatura**: arquivos em kebab-case com sufixo de papel (`create-note.ts`, `notes-repository.ts`, `create-note.controller.ts`, `note-presenter.ts`, `http.module.ts`); um artefato por arquivo, com o nome do arquivo espelhando o do artefato; contextos no singular, repositórios no plural do agregado.
- **Path aliases**: `@*` → `src/*`, `@tests/*` → `test/*`. Import relativo só entre arquivos irmãos da mesma pasta.

## Contrato de erro da API

Toda resposta de erro — validação, regra de negócio ou falha inesperada — sai no mesmo formato, produzido pelo `AllExceptionsFilter` (`@infra/http/filters/all-exceptions-filter`), registrado globalmente com `APP_FILTER` no `HttpModule`:

```json
{
  "statusCode": 422,
  "code": "VALIDATION_FAILED",
  "message": "Falha na validação",
  "details": [{ "field": "ownerId", "message": "UUID inválido" }],
  "path": "/notes",
  "timestamp": "2026-07-28T12:00:00.000Z",
  "requestId": "6d0f1a1e-2b6b-4a5f-9a0e-2f2b0e7d51c3"
}
```

- `code` é o `code` estável do `BaseError`, em inglês, e é o que o app mobile deve consumir para decidir o que fazer — nunca a mensagem, que é texto de apresentação.
- `message` e `details[].message` são **em português**, prontos para exibição: é a regra de idioma do repositório (ver [Idioma das mensagens](#idioma-das-mensagens)).
- `details` só aparece em erro de validação, com um item por issue do Zod; `field` é o caminho do campo (`owner.id`) ou a origem do argumento quando o erro não é de um campo específico.
- `requestId` vem do `RequestIdMiddleware`, que aceita o header `x-request-id` do cliente ou gera um UUID, devolve-o no header da resposta e o repete no corpo.

| Categoria                 | Origem                                              | Status               |
| ------------------------- | --------------------------------------------------- | -------------------- |
| Validação de entrada      | `ValidationError`, lançado pelo `ZodValidationPipe` | 422                  |
| Invariante de domínio     | `InvariantError`, lançado pela entidade             | 422                  |
| Registro inexistente      | `ResourceNotFoundError`                             | 404                  |
| Registro de outro usuário | `NotAllowedError`                                   | 403                  |
| Demais erros de negócio   | qualquer `BaseError` sem mapeamento                 | 400                  |
| Exceção do NestJS         | `HttpException` (rota inexistente, método...)       | o da própria exceção |
| Falha inesperada          | qualquer outra coisa                                | 500                  |

O mapa código → status vive em `@infra/http/errors/http-status-by-error-code`. Ao criar um erro de negócio novo, herde de `BaseError` com um `code` estável e acrescente a entrada ali se 400 não servir.

Resposta 5xx nunca devolve a mensagem original nem stack trace: o corpo traz `Erro interno do servidor` e o stack vai só para o log, junto de método, rota, status e `requestId`. Erros esperados (4xx) não são logados.

## Idioma das mensagens

Identificador, nome de arquivo e `code` de erro são em inglês; **toda mensagem que chega ao usuário é em português**, porque o app é para um público brasileiro e o texto da API é exibido como está.

- **Erro de negócio e invariante** recebem a frase pronta no ponto em que são lançados — `new ResourceNotFoundError('Nota não encontrada')`, `new InvariantError('O título da nota não pode ser vazio')`. `ResourceNotFoundError` e `NotAllowedError` levam a mensagem inteira, não um nome de recurso interpolado, justamente para a concordância de gênero sair certa.
- **Validação de entrada** sai traduzida sem esforço: o `ZodValidationPipe` passa o locale português do Zod (`z.locales.pt()`) em cada `safeParse`, então a mensagem padrão já vem como `UUID inválido` ou `Muito pequeno: esperado que string tivesse >=1 caracteres`. Mensagem customizada em schema (`moneySchema`) também é escrita em português.
- **Continuam em inglês**, por serem diagnóstico de quem opera a aplicação e não texto de tela: os logs, a validação das variáveis de ambiente (`@infra/env/validate-env`, que derruba o bootstrap) e a mensagem que o próprio Nest gera para `HttpException` de rota inexistente ou método não permitido (`Cannot GET /unknown`) — nesse caso o cliente decide pelo `code`.

## Valores monetários

Todo valor monetário é **inteiro em centavos** (RNF004) da entrada à persistência; as duas casas decimais existem apenas na exibição. `number` cru não circula: quem representa dinheiro é o Value Object `Money` (`@core/value-objects/money`), imutável, que só aceita inteiro seguro em centavos e lança `InvariantError` para fracionário, `NaN`, infinito ou estouro do inteiro seguro.

| Operação                    | Comportamento                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------------- |
| `add` / `subtract`          | Devolvem um novo `Money`; valor negativo é válido (saldo devedor, estorno).                          |
| `multiply(factor)`          | Aceita fator fracionário e arredonda para o centavo mais próximo, afastando-se do zero (`166.5 → 167`, `-166.5 → -167`). |
| `allocate(parts)`           | Divisão com rateio: reparte o valor em `parts` inteiras e joga a diferença de arredondamento na **primeira** parte (RN065). A soma das partes é sempre igual ao total. |
| `toString()`                | Formata com duas casas e ponto decimal (`123456 → "1234.56"`, `-5 → "-0.05"`) — sem símbolo de moeda e sem locale, que são decisão do cliente. |

As três bordas:

- **Entrada** usa o `moneySchema` (`@infra/http/schemas/money-schema`), que valida o inteiro em centavos e já transforma em `Money` — compõe com o `ZodValidationPipe` como qualquer outro schema. Restrição adicional (valor obrigatoriamente positivo, por exemplo) fica em quem usa o schema, não nele.
- **Persistência** usa a coluna `moneyAmount(name)` (`@infra/database/drizzle/schemas/money-amount`), um `bigint` com `mode: 'number'`. Nenhum campo monetário usa `numeric`, `real` ou `double precision`.
- **Saída** passa pelo `MoneyPresenter`, que expõe as duas representações no mesmo objeto e sempre com os mesmos nomes:

```json
{ "amountInCents": 123456, "formatted": "1234.56" }
```

O app mobile deve calcular sobre `amountInCents` e usar `formatted` só para exibir.

## Configuração e segurança de transporte

| Variável            | Padrão                           | Para que serve                                                         |
| ------------------- | -------------------------------- | ---------------------------------------------------------------------- |
| `NODE_ENV`          | `development`                    | `development`, `test` ou `production`; endurece a validação em produção |
| `PORT`              | `3000`                           | Porta da API                                                           |
| `DATABASE_URL`      | obrigatória                      | URL de conexão                                                         |
| `DATABASE_SSL`      | `false`                          | `true` para instâncias gerenciadas em nuvem (RNF003)                   |
| `DATABASE_POOL_MAX` | `10`                             | Tamanho máximo do pool                                                 |
| `CORS_ORIGINS`      | `*`                              | Origens aceitas, separadas por vírgula                                 |
| `ENFORCE_HTTPS`     | `true` em produção, `false` fora | Redireciona HTTP para HTTPS e habilita o HSTS (RNF007)                 |
| `HSTS_MAX_AGE`      | `31536000`                       | Duração, em segundos, do `Strict-Transport-Security`                   |

Em `NODE_ENV="production"` o `envSchema` recusa `ENFORCE_HTTPS="false"` e recusa `*` em `CORS_ORIGINS` — as duas coisas derrubam o bootstrap, não geram aviso.

Três middlewares cuidam do transporte, aplicados no `HttpModule` na ordem `CorsMiddleware → SecurityHeadersMiddleware → RequestIdMiddleware → HttpsRedirectMiddleware`:

- **`CorsMiddleware`** monta a política a partir de `CORS_ORIGINS`, expõe o `x-request-id` e mantém as credenciais de navegador desabilitadas — a autenticação é por Bearer token (RNF005), não por cookie.
- **`SecurityHeadersMiddleware`** aplica o helmet com CSP `default-src 'none'`, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer` e `Cross-Origin-Resource-Policy: same-origin`; o `Strict-Transport-Security` só entra com `ENFORCE_HTTPS="true"`.
- **`HttpsRedirectMiddleware`** decide pelo `x-forwarded-proto` (o TLS termina no proxy, que é obrigado a sobrescrever esse header) com fallback para `request.secure`. Requisição insegura vira **308**, que preserva método e corpo; sem `Host` para onde redirecionar, vira `403 INSECURE_TRANSPORT`.

Nenhum segredo é versionado: só o `.env.example` vai para o repositório, com defaults de desenvolvimento.

## Testes

- Todo teste vive em `test/` — nada de `*.spec.ts` dentro de `src/`.
- São **duas configurações do Vitest**: `vitest.config.js` coleta `test/units/**/*.spec.ts` (unitários) e `vitest.config.e2e.js` coleta `test/e2e/**/*.e2e-spec.ts` (e2e). Um arquivo fora desses padrões não é executado por ninguém.
- **Unitários** ficam em `test/units/` **no mesmo caminho do arquivo testado em `src/`** (`src/domain/example/application/use-cases/create-note.ts` → `test/units/domain/example/application/use-cases/create-note.spec.ts`) e cobrem entidades e casos de uso usando **repositórios in-memory**, sem Docker de banco e sem NestJS.
- **E2E** ficam em `test/e2e/` **no mesmo caminho do arquivo testado em `src/`** — normalmente o controller (`src/infra/http/controllers/get-note.controller.ts` → `test/e2e/infra/http/controllers/get-note.controller.e2e-spec.ts`), um arquivo por controller. Sobem a aplicação Nest e batem no serviço `database` com as migrations já aplicadas (`make db-migrate`). Cada spec limpa no `beforeAll` as tabelas que usa, via `app.get(DrizzleService)`, e os arquivos rodam em série (`fileParallelism: false`) porque compartilham o mesmo banco.
- **Factories** ficam em `test/factories/make-<entidade>.ts`, com assinatura `(override = {}, id?)`, e são a forma padrão de montar entidade em spec — exceto no spec da própria entidade, onde a construção é o que está sob teste.
- Coverage está habilitado por padrão nos unitários, então qualquer execução grava em `coverage/`. A meta é **100% dos arquivos testáveis**, com o `vitest.config.js` reprovando abaixo de **85%**; ficam fora da conta o bootstrap, os módulos Nest, o `DrizzleService`, os repositórios e schemas Drizzle e os repositórios in-memory.
- Casos de uso novos entram com teste unitário; o teste deve referenciar a RN que implementa.
- A skill `spec-writer` (em `.claude/skills/`) traz o padrão completo de escrita dos specs, a lista de edge cases do domínio e o checklist.
- No CI (`.github/workflows/server-tests.yml`) os testes rodam **sem Docker**: Node 22 via `actions/setup-node` e os scripts npm direto (`npm ci`, `npm test`, `npm run db:migrate`, `npm run test:e2e`), com o Postgres subindo como _service container_ do GitHub Actions em `localhost:5432`. O `Makefile` continua sendo o caminho do desenvolvimento local; ao criar um alvo novo que o CI precise, adicione o script npm equivalente ao workflow. Roda a cada push e pull request para `main` e `develop` que toque em `server/`.

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
