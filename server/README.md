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
    <contexto>/                    # user, asset, transaction, invoice, budget, goal, ...
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
      drizzle/                     # schemas, mappers, repositories, migrations
      in-memory/                   # implementações em memória das portas
      database.module.ts           # liga cada porta à sua implementação
    http/
      controllers/                 # finos: traduzem HTTP <-> caso de uso, nunca contêm regra
      pipes/                       # ZodValidationPipe
      presenters/                  # domínio -> JSON de resposta
      http.module.ts               # controllers + instanciação dos casos de uso
    auth/                          # JWT, guards, estratégias (RNF005)
    cryptography/                  # implementações de hash/JWT
    env/                           # schema Zod das variáveis de ambiente

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
export type GetNoteResponse = Either<ResourceNotFoundError | NotAllowedError, { note: Note }>

export class GetNoteUseCase implements UseCase<GetNoteRequest, GetNoteResponse> {
  constructor(private readonly notesRepository: NotesRepository) {}

  async execute({ noteId, ownerId }: GetNoteRequest): Promise<GetNoteResponse> {
    const note = await this.notesRepository.findById(noteId)

    if (!note) return left(new ResourceNotFoundError('Note'))
    if (note.ownerId.toString() !== ownerId) return left(new NotAllowedError())

    return right({ note })
  }
}
```

- **`Left` é erro esperado de negócio** — registro inexistente, registro de outro usuário, vínculo que impede a exclusão. É valor de retorno, entra na assinatura e o controller é obrigado a tratá-lo.
- **Exceção é falha inesperada** ou invariante de domínio violada (`InvariantError`), lançada pela entidade quando um dado que a borda deveria ter barrado chega até ela.
- Erros herdam de `BaseError` e carregam um `code` estável; a tradução para status HTTP é feita na infraestrutura, nunca dentro do caso de uso.
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

Vale para qualquer parâmetro (`@Body`, `@Query`, `@Param`) e o tipo do handler sai do próprio schema, via `z.infer` — schema e tipo nunca saem de sincronia. O handler recebe o dado já validado e coerido; entrada inválida vira `400` com `{ message: 'Validation failed', errors }`.

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

## Testes

- **Unitários** ficam em `test/units/`, **no mesmo caminho do arquivo testado dentro de `src/`**: `src/domain/example/application/use-cases/create-note.ts` é testado por `test/units/domain/example/application/use-cases/create-note.spec.ts`. Cobrem entidades e casos de uso com repositórios em memória — sem NestJS e sem banco. Todo caso de uso novo entra com teste, e o teste referencia a RN que implementa.
- **E2E** (`test/**/*.e2e-spec.ts`) sobem a aplicação Nest e batem nas rotas HTTP.
- Como os testes ficam fora de `src/`, eles importam sempre pelos aliases (`@core/…`, `@domain/…`, `@infra/…`).

```sh
make test                             # unitários (com coverage em coverage/)
make test-e2e                         # end-to-end
make test-file FILE=<caminho|padrão>  # um arquivo
make test-name NAME="<nome>"          # um caso isolado
```

## Estilo

Prettier: sem ponto e vírgula, aspas simples, `printWidth` 160, `arrowParens: avoid`, 2 espaços. ESLint com `typescript-eslint` + integração Prettier. `make format` e `make lint` aplicam ambos.
