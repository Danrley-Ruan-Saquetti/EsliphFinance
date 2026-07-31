# EsliphFinance — Server

API do EsliphFinance: NestJS + PostgreSQL, rodando inteiramente em Docker. As regras de negócio estão em [`../docs/requirements.md`](../docs/requirements.md), que é a fonte de verdade do domínio — toda implementação referencia a RN correspondente.

## Como rodar

Tudo executa dentro do container `workspace`; **nada de `npm`/`node`/`npx` na máquina host**. Os comandos são alvos do `Makefile`:

```sh
make deps     # instala as dependências
make up       # sobe workspace + Postgres
make dev      # API em modo watch
make check    # typecheck + lint + testes (unitários e e2e)
make help     # lista completa de alvos
```

Variáveis de ambiente: copie `.env.example` para `.env` (o Compose lê o arquivo automaticamente). Sem `.env` o ambiente sobe com os defaults de desenvolvimento.

## Arquitetura

DDD + Clean Architecture. A regra fundamental é a **regra de dependência**: as setas apontam sempre para dentro.

```
Infra (HTTP, Drizzle, Auth, Env)  →  Application (use-cases, ports)  →  Domain (entidades, VOs)
```

- O **domínio** não conhece ninguém: nada de `@Injectable()`, `drizzle-orm`, `zod` ou tipos do Express dentro de entidades e casos de uso.
- A **aplicação** conhece o domínio e declara portas (interfaces de repositórios e de serviços externos).
- A **infraestrutura** conhece as duas e implementa as portas. NestJS, Drizzle, Express e Zod são detalhes que vivem só aqui.

### Estrutura de pastas

```
src/
  core/                            # blocos de construção compartilhados, sem regra de negócio
    entities/                      #   Entity, AggregateRoot, UniqueEntityID
    errors/                        #   BaseError e erros genéricos de aplicação
    events/                        #   contrato de evento de domínio
    types/                         #   utilitários de tipo (Optional)
    value-objects/                 #   ValueObject base
    either.ts                      #   retorno de sucesso/erro dos casos de uso
    use-case.ts                    #   contrato de caso de uso

  domain/
    <contexto>/                    # user, account, transaction, invoice, budget, goal, ...
      enterprise/
        entities/                  #   entidades e agregados — invariantes do negócio
        value-objects/
        events/
      application/
        use-cases/                 #   um caso de uso por arquivo, uma responsabilidade
        repositories/              #   INTERFACES dos repositórios (portas)
        services/                  #   portas de serviços externos (hasher, criptografia...)

  infra/
    database/
      drizzle/
        schemas/                   #   tabelas Drizzle (fonte das migrations)
        mappers/                   #   registro do banco <-> entidade de domínio
        repositories/              #   implementações Drizzle das portas
        migrations/                #   SQL versionado gerado pelo Drizzle Kit
        drizzle.service.ts         #   pool de conexão no ciclo de vida do Nest
      in-memory/                   # implementações em memória das portas (testes unitários)
      database.module.ts           # liga cada porta à sua implementação
    http/
      controllers/                 # finos: traduzem HTTP <-> caso de uso, nunca contêm regra
      middlewares/                 # CORS, headers de segurança, HTTPS, identificador de requisição
      pipes/                       # ZodValidationPipe
      presenters/                  # domínio -> JSON de resposta
      http.module.ts               # controllers + instanciação dos casos de uso
    auth/                          # JWT, guards, estratégias (RNF005)
    cryptography/                  # implementações de hash/JWT
    env/                           # schema Zod das variáveis de ambiente + EnvService

  app.module.ts                    # raiz: agrega os módulos e o que é transversal
  main.ts

test/
  units/                           # testes unitários, espelhando a árvore de src/
  *.e2e-spec.ts                    # testes end-to-end
```

### Módulo de exemplo

`src/domain/example` (entidade `Note`) e os arquivos correspondentes em `src/infra` existem **como referência de estrutura**, não como parte do domínio do EsliphFinance. Percorrem uma fatia vertical completa — entidade → porta de repositório → caso de uso → controller → presenter → módulo Nest — e são o modelo a copiar ao criar um contexto novo. Devem ser removidos quando os contextos reais tornarem a referência desnecessária.

## Convenções

### Nomenclatura de arquivos e módulos

- Arquivos em **kebab-case**, com o sufixo indicando o papel: `create-note.ts` (caso de uso), `notes-repository.ts` (porta), `create-note.controller.ts`, `note-presenter.ts`, `zod-validation-pipe.ts`, `http.module.ts`, `create-note.spec.ts`, `notes.e2e-spec.ts`.
- **Um artefato por arquivo**, e o nome do arquivo é o nome do artefato: a classe `CreateNoteUseCase` mora em `create-note.ts`; `NotesRepository`, em `notes-repository.ts`.
- **Casos de uso** recebem o nome da ação no infinitivo (`create-note`, `get-note`, `list-notes`) e a classe leva o sufixo `UseCase`.
- **Repositórios** ficam no plural do agregado (`NotesRepository`); as implementações prefixam a tecnologia (`DrizzleNotesRepository`, `InMemoryNotesRepository`).
- **Contextos de domínio** ficam no singular (`domain/note`, `domain/transaction`).
- Código, arquivos e identificadores em **inglês**; comentários e documentação em **português**.

### Retorno dos casos de uso

Todo caso de uso implementa `UseCase<Request, Response>` — um único método `execute` — e retorna `Either<Erro, Sucesso>`:

```ts
export type GetNoteResponse = Either<ResourceNotFoundError, { note: Note }>

export class GetNoteUseCase implements UseCase<GetNoteRequest, GetNoteResponse> {
  constructor(private readonly notesRepository: NotesRepository) {}

  async execute({ noteId, ownerId }: GetNoteRequest): Promise<GetNoteResponse> {
    const note = await this.notesRepository.findById(noteId)

    if (!note || note.ownerId.toString() !== ownerId) return left(new ResourceNotFoundError('Nota não encontrada'))

    return right({ note })
  }
}
```

- **`Left` é erro esperado de negócio** — registro inexistente, registro de outro usuário, vínculo que impede a exclusão. É valor de retorno, entra na assinatura e o controller é obrigado a tratá-lo.
- **Exceção é falha inesperada** ou invariante de domínio violada (`InvariantError`), lançada pela entidade quando um dado que a borda deveria ter barrado chega até ela.
- Erros herdam de `BaseError` e carregam um `code` estável em inglês, com a mensagem em português — é ela que o cliente exibe; a tradução para status HTTP é feita na infraestrutura, nunca dentro do caso de uso.
- Casos de uso **não** recebem `@Injectable()`: são registrados no módulo Nest com `useFactory`, o que mantém a aplicação livre do framework.

### Validação de entrada

Zod valida nas bordas. O `ZodValidationPipe` recebe o schema no construtor e é aplicado **por rota, no próprio parâmetro** — cada rota declara o que aceita, e um controller pode usar quantos schemas precisar:

```ts
const createNoteBodySchema = z.object({
  title: z.string().min(1).max(120),
  content: z.string().min(1),
})

type CreateNoteBody = z.infer<typeof createNoteBodySchema>

@Post()
async handle(@Body(new ZodValidationPipe(createNoteBodySchema)) body: CreateNoteBody) { ... }
```

Vale para qualquer parâmetro (`@Body`, `@Query`, `@Param`) e o tipo do handler sai do próprio schema, via `z.infer` — schema e tipo nunca saem de sincronia. O handler recebe o dado já validado e coerido; entrada inválida vira `422` com `{ code: 'VALIDATION_FAILED', message: 'Falha na validação', details }`, e as mensagens de campo saem em português, pelo locale do Zod que o pipe aplica.

Validar na borda **não substitui** as invariantes do domínio: a entidade continua responsável por rejeitar estados inválidos.

### Outras regras

- **Dinheiro** é inteiro em centavos (RNF004), encapsulado em um Value Object; nunca `float`, nem em coluna do banco.
- **Propriedade do registro** é verificada dentro do caso de uso, comparando o dono antes de ler ou alterar (RN010, RN011) — não por filtro implícito no repositório.
- **Exclusões** são majoritariamente lógicas ou bloqueadas por vínculos; conferir a RN antes de implementar um delete.

### Path aliases

Configurados em `tsconfig.json` e resolvidos pelo Nest CLI no build e pelo Vitest nos testes:

| Alias      | Aponta para |
| ---------- | ----------- |
| `@*`       | `src/*`     |
| `@tests/*` | `test/*`    |

```ts
import { Either, left, right } from '@core/either'
import { NotesRepository } from '@domain/example/application/repositories/notes-repository'
import { HttpModule } from '@infra/http/http.module'
```

Imports relativos ficam reservados para arquivos irmãos dentro da mesma pasta.

## Configuração e segurança

### Variáveis de ambiente

Toda a configuração vem de variáveis de ambiente validadas com Zod em `src/infra/env/env.ts` e lidas pelo `EnvService`. A validação roda no bootstrap, dentro do `ConfigModule`: se faltar uma variável obrigatória ou algum valor for inválido, a aplicação **não sobe** e o erro lista cada problema em uma linha.

```
Invalid environment variables:
  - DATABASE_URL is required
  - PORT: Too small: expected number to be >0
```

| Variável            | Padrão                             | Para que serve                                                            |
| ------------------- | ---------------------------------- | ------------------------------------------------------------------------- |
| `NODE_ENV`          | `development`                      | `development`, `test` ou `production`; endurece a validação em produção    |
| `PORT`              | `3000`                             | Porta da API                                                              |
| `DATABASE_URL`      | obrigatória                        | URL de conexão — o `database` do Compose em desenvolvimento               |
| `DATABASE_SSL`      | `false`                            | `true` para instâncias gerenciadas em nuvem (RNF003)                      |
| `DATABASE_POOL_MAX` | `10`                               | Tamanho máximo do pool                                                    |
| `CORS_ORIGINS`      | `*`                                | Origens aceitas, separadas por vírgula; `*` é rejeitado em produção        |
| `ENFORCE_HTTPS`     | `true` em produção, `false` fora   | Redireciona HTTP para HTTPS e habilita o HSTS (RNF007)                    |
| `HSTS_MAX_AGE`      | `31536000`                         | Duração, em segundos, do `Strict-Transport-Security`                      |

Nenhum segredo é versionado: `.env` está no `.gitignore` e só o `.env.example`, com defaults de desenvolvimento, vai para o repositório. Em produção a `DATABASE_URL` aponta para a instância em nuvem, com `DATABASE_SSL="true"`, e vem do ambiente. Ao introduzir uma variável nova, atualize o schema, o `.env.example` e o `docker-compose.yml`.

Com `NODE_ENV="production"` a validação é mais estrita e a aplicação recusa subir se `ENFORCE_HTTPS="false"` ou se `CORS_ORIGINS` contiver `*`.

### HTTPS (RNF007)

O TLS termina no proxy à frente da API — o processo Node atende em HTTP dentro da rede privada. O proxy é obrigado a **sobrescrever** o header `x-forwarded-proto` com o protocolo real do cliente, porque é ele que o `HttpsRedirectMiddleware` usa para decidir; quando o TLS termina na própria aplicação, `request.secure` cobre o caso.

Com `ENFORCE_HTTPS="true"`, toda requisição que chega em HTTP recebe **308 Permanent Redirect** para a mesma URL em `https://` — o 308 preserva método e corpo, então um `POST` é refeito pelo cliente sem perder o payload. Requisição sem header `Host`, para a qual não há destino de redirecionamento, é recusada com `403 INSECURE_TRANSPORT`.

O `Strict-Transport-Security` só é anunciado quando `ENFORCE_HTTPS="true"`: em ambiente HTTP ele não teria efeito e travaria o domínio de desenvolvimento no navegador.

### Headers de segurança e CORS

`SecurityHeadersMiddleware` aplica o helmet com uma política fechada, apropriada para uma API que só responde JSON, e remove o `X-Powered-By`:

| Header                         | Valor                                       |
| ------------------------------ | ------------------------------------------- |
| `Content-Security-Policy`      | `default-src 'none'; frame-ancestors 'none'` |
| `X-Frame-Options`              | `DENY`                                      |
| `X-Content-Type-Options`       | `nosniff`                                   |
| `Referrer-Policy`              | `no-referrer`                               |
| `Cross-Origin-Resource-Policy` | `same-origin`                               |
| `Strict-Transport-Security`    | só com `ENFORCE_HTTPS="true"`               |

`CorsMiddleware` monta a política a partir de `CORS_ORIGINS`, aceita `Content-Type`, `Authorization` e `x-request-id`, expõe `x-request-id` ao cliente e guarda o preflight por 24 horas. Credenciais de navegador ficam desabilitadas: a autenticação é por Bearer token (RNF005), não por cookie.

A ordem no `HttpModule` é `CorsMiddleware → SecurityHeadersMiddleware → RequestIdMiddleware → HttpsRedirectMiddleware`, para que o preflight seja respondido antes de tudo, os headers de segurança valham inclusive nas respostas de erro e o identificador de requisição já exista quando o redirecionamento ou a recusa acontece.

## Banco de dados e migrations

Persistência com **Drizzle ORM** sobre PostgreSQL, e **Drizzle Kit** para as migrations.

### Conexão

`DrizzleService` (`src/infra/database/drizzle/drizzle.service.ts`) é o único dono do pool `pg`. Ele abre a conexão no bootstrap (`onModuleInit` valida o acesso ao banco, então a aplicação falha logo se ele estiver indisponível) e a encerra no shutdown (`onApplicationShutdown`, habilitado por `app.enableShutdownHooks()` no `main.ts`). A `DATABASE_URL`, o `DATABASE_SSL` e o `DATABASE_POOL_MAX` que ele usa vêm do `EnvService` — ver [Variáveis de ambiente](#variáveis-de-ambiente).

### Schema e migrations

O schema é declarado em `src/infra/database/drizzle/schemas/` e é a fonte das migrations — **nunca altere o banco à mão**. O fluxo é sempre: editar o schema, gerar a migration, revisar o SQL, aplicar.

```sh
make db-generate NAME=create_notes_table  # gera a migration a partir do schema
make db-migrate                           # aplica as migrations pendentes
make db-check                             # verifica conflitos entre migrations
make db-studio                            # Drizzle Studio em http://localhost:4983
make db-reset                             # recria o banco do zero e migra (APAGA os dados)
```

O SQL gerado e os metadados ficam em `src/infra/database/drizzle/migrations/` e são versionados. O Drizzle registra o que já foi aplicado na tabela `drizzle.__drizzle_migrations`, então `make db-migrate` é idempotente.

`make db-migrate` roda pelo serviço `migrate` do `docker-compose.yml` (perfil `migration`), que espera o Postgres ficar saudável antes de executar — o mesmo caminho usado pelo CI antes dos testes e2e.

### Mappers e repositórios

A entidade de domínio nunca conhece a tabela. Um **mapper** (`DrizzleNoteMapper`) traduz nos dois sentidos, e o **repositório** (`DrizzleNotesRepository`) implementa a porta declarada no domínio. Trocar a implementação é uma linha em `database.module.ts`; o resto da aplicação não muda.

## Testes

- **Unitários** ficam em `test/units/`, **no mesmo caminho do arquivo testado dentro de `src/`**: `src/domain/example/application/use-cases/create-note.ts` é testado por `test/units/domain/example/application/use-cases/create-note.spec.ts`. Cobrem entidades e casos de uso com repositórios em memória — sem NestJS e sem banco. Todo caso de uso novo entra com teste, e o teste referencia a RN que implementa.
- **E2E** (`test/**/*.e2e-spec.ts`) sobem a aplicação Nest e batem nas rotas HTTP contra o Postgres do Compose, com as migrations já aplicadas (`make db-migrate`). Cada spec limpa as tabelas que usa antes de rodar.
- Como os testes ficam fora de `src/`, eles importam sempre pelos aliases (`@core/…`, `@domain/…`, `@infra/…`).

```sh
make test                             # unitários (com coverage em coverage/)
make test-e2e                         # end-to-end
make test-file FILE=<caminho|padrão>  # um arquivo
make test-name NAME="<nome>"          # um caso isolado
```

## Estilo

Prettier: sem ponto e vírgula, aspas simples, `printWidth` 160, `arrowParens: avoid`, 2 espaços. ESLint com `typescript-eslint` + integração Prettier. `make format` e `make lint` aplicam ambos.
