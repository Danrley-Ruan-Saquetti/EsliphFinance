# Módulos e injeção de dependência

> **Cobre** `server/src/app.module.ts`, `server/src/main.ts` e os `*.module.ts` de `server/src/infra`

Como as peças são montadas e por que a aplicação consegue depender do NestJS sem que o domínio o conheça.

## O grafo

| Módulo | Importa | Provê | Exporta |
| ------ | ------- | ----- | ------- |
| `AppModule` | `EnvModule`, `DatabaseModule`, `HttpModule` | — | — |
| `EnvModule` (`@Global()`) | `ConfigModule.forRoot({ validate: validateEnv })` | `EnvService` | `EnvService` |
| `DatabaseModule` | `EnvModule` | `DrizzleService` e a ligação de cada porta de repositório à implementação Drizzle | `DrizzleService` e todas as portas |
| `CryptographyModule` | `EnvModule`, `JwtModule.registerAsync` | Implementações de hash, geração e verificação de token | As portas, nunca as implementações |
| `AuthModule` | `CryptographyModule` | `JwtAuthGuard` como `APP_GUARD` | — |
| `HttpModule` | `DatabaseModule`, `CryptographyModule`, `EnvModule`, `AuthModule` | Controllers, `AllExceptionsFilter` como `APP_FILTER`, **todos os casos de uso**, cadeia de middlewares | — |

`EnvModule` é `@Global()`: `EnvService` é injetável em qualquer lugar sem que o módulo o importe. Os módulos ainda o importam explicitamente, o que é redundante mas inofensivo — e é o que faz o grafo se ler sozinho.

`AuthModule` não exporta nada e ainda assim protege a aplicação inteira: quem faz isso é o `APP_GUARD`, que vale globalmente pelo simples fato de o módulo estar no grafo. Ver [`security.md`](security.md).

## As três formas de prover

**`useClass` para a implementação de uma porta.** A porta é a classe abstrata declarada no domínio, e ela é **o próprio token de injeção** — não há string nem símbolo:

| Token (porta) | Implementação | Onde |
| ------------- | ------------- | ---- |
| `UsersRepository`, `RefreshTokensRepository`, `AccountGroupsRepository`, `AccountsRepository`, `NotesRepository` | `Drizzle*Repository` | `database.module.ts` |
| `AccessTokenGenerator`, `AccessTokenVerifier`, `RefreshTokenGenerator` | `Jwt*` / `Crypto*` | `cryptography.module.ts` |

O caso de uso declara o tipo abstrato no construtor e nunca sabe qual implementação recebeu. É o que permite trocar Drizzle por in-memory no teste sem tocar no código de produção.

**`useExisting` quando uma classe atende a duas portas.** `BcryptHasher` implementa `HashGenerator` e `HashComparer`; as duas apontam para a **mesma instância** via `useExisting`, não para duas cópias. Usar `useClass` nos dois lugares criaria dois objetos — inofensivo aqui, caro em qualquer implementação com estado ou conexão.

**`useFactory` para caso de uso.** Casos de uso **não recebem `@Injectable()`**, para que a camada de aplicação não importe nada do NestJS. Em troca, cada um é montado à mão no `HttpModule`:

```ts
{
  provide: CreateAccountUseCase,
  useFactory: (accountsRepository: AccountsRepository, accountGroupsRepository: AccountGroupsRepository) =>
    new CreateAccountUseCase(accountsRepository, accountGroupsRepository),
  inject: [AccountsRepository, AccountGroupsRepository],
}
```

A ordem de `inject` é a ordem dos parâmetros da fábrica — trocar duas dependências do mesmo tipo aqui compila e quebra em execução.

Quando o caso de uso precisa de configuração, **ele recebe o valor, não o `EnvService`**: `AuthenticateUserUseCase` e `RefreshSessionUseCase` recebem `REFRESH_TOKEN_EXPIRES_IN_SECONDS` já resolvido pela fábrica. O domínio não conhece a infraestrutura de configuração, e o caso de uso fica testável sem montar ambiente.

## Ciclo de vida

| Momento | O que acontece |
| ------- | -------------- |
| Bootstrap | `ConfigModule` roda `validateEnv`; variável ausente ou inválida **derruba a aplicação** com a lista de problemas |
| `NestFactory.create` | `DrizzleService` instancia o pool `pg` no construtor |
| `app.enableShutdownHooks()` | Habilita os hooks de desligamento — sem esta linha, `onApplicationShutdown` não roda |
| `onModuleInit` | `DrizzleService` pega e devolve uma conexão só para falhar cedo se o banco não responder |
| `listen` | Porta vinda do `EnvService` |
| `onApplicationShutdown` | `DrizzleService` encerra o pool |

## Onde tocar

| Mudança | Passos |
| ------- | ------ |
| Caso de uso novo | Provider com `useFactory` + `inject` no `HttpModule`; o controller o injeta pelo tipo |
| Porta nova de repositório | Classe abstrata no domínio; `{ provide: Porta, useClass: Impl }` no `DatabaseModule`; acrescentar a porta em `exports` |
| Porta nova de serviço externo | Mesma coisa no `CryptographyModule`, exportando a porta e não a implementação |
| Provider global novo | `APP_FILTER`/`APP_GUARD`/`APP_PIPE`/`APP_INTERCEPTOR` no módulo correspondente — e registre o efeito no [`README.md`](README.md), porque passa a valer em rota que ninguém revisou |

## Ainda não existe

| Ausente | Consequência |
| ------- | ------------ |
| Um módulo por contexto de domínio | Todo caso de uso e todo controller são registrados no `HttpModule`, que cresce a cada feature e é ponto de conflito garantido em merge |
| Módulo dinâmico ou provider com escopo de requisição | Tudo é singleton; não há contexto por requisição além do que trafega em parâmetro |
