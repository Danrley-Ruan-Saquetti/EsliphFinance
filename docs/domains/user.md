# Usuários

> **Contexto** `server/src/domain/user` · **Requisitos** RF001, RF002 · RN001–RN014 · RNF005, RNF006

O contexto do _Usuário_ guarda a identidade e a sessão. Ele é a raiz de todos os outros: RN010 diz que todo registro do sistema pertence a um usuário, então toda tabela tem `owner_id` apontando para cá e todo caso de uso recebe o dono vindo do token.

São **dois agregados**, e a separação é deliberada: `User` é a identidade; `RefreshToken` é uma sessão, que nasce e é revogada muitas vezes ao longo da vida do usuário e precisa ser invalidável individualmente (RN007, RN008).

## Mapa dos arquivos

| Artefato | Caminho (a partir de `server/`) | O que só ele sabe |
| -------- | ------------------------------- | ----------------- |
| `User` (agregado) | `src/domain/user/enterprise/entities/user.ts` | Nome não vazio de até 120 caracteres; `isDeleted` derivado de `deletedAt`; `changeName` e `changeEmail` atualizam `updatedAt`. Guarda o **hash** da senha, nunca a senha. |
| `RefreshToken` (agregado) | `src/domain/user/enterprise/entities/refresh-token.ts` | `issue({ userId, tokenHash, expiresInSeconds })` calcula a expiração — é por aqui que login e renovação emitem. `create` fica para reconstruir do banco. `isUsable` = nem revogado, nem vencido. `revoke()` é idempotente. |
| `Email` (VO) | `src/domain/user/enterprise/value-objects/email.ts` | Normaliza para minúsculas sem espaços e valida formato e tamanho. `Email.normalize` é usado no login para buscar pelo mesmo formato que foi gravado. |
| `Password` (VO) | `src/domain/user/enterprise/value-objects/password.ts` | Mínimo de 8 caracteres (RN003). Existe só para validar na entrada — **não** é persistido nem atravessa a entidade. |
| `UsersRepository` (porta) | `src/domain/user/application/repositories/users-repository.ts` | `create`, `save`, `findById`, `findByEmail`. |
| `RefreshTokensRepository` (porta) | `src/domain/user/application/repositories/refresh-tokens-repository.ts` | Busca só por `findByTokenHash` — nunca pelo token em texto. |
| Portas de serviço | `src/domain/user/application/services/` | `HashGenerator`, `HashComparer`, `AccessTokenGenerator`, `AccessTokenVerifier`, `RefreshTokenGenerator`. São o único ponto em que o domínio fala de criptografia, e falam por interface. |
| `AuthenticatedSession` | `src/domain/user/application/use-cases/authenticated-session.ts` | O par `{ accessToken, refreshToken }` devolvido pelo login e pela renovação. |
| Casos de uso | `src/domain/user/application/use-cases/` | `create-user`, `authenticate-user`, `refresh-session`, `end-session`, `get-user-profile`, `update-user-profile`. |
| Erros do contexto | `src/domain/user/application/use-cases/errors/` | `EmailAlreadyInUseError` (409), `InvalidCredentialsError` (401), `InvalidRefreshTokenError` (401). |
| Tabelas `users` e `refresh_tokens` | `src/infra/database/drizzle/schemas/{users,refresh-tokens}.ts` | `users.email` é único no banco; `refresh_tokens.token_hash` é único e tem 64 caracteres — o SHA-256 em hexadecimal. |
| Repositórios Drizzle | `src/infra/database/drizzle/repositories/drizzle-{users,refresh-tokens}-repository.ts` | `findByEmail` **não** filtra `deleted_at` — é o que sustenta a RN014. |
| Implementações de criptografia | `src/infra/cryptography/` | `BcryptHasher` (implementa as duas portas de hash), `JwtAccessTokenGenerator`, `JwtAccessTokenVerifier`, `CryptoRefreshTokenGenerator`. |
| Controllers | `src/infra/http/controllers/{create-user,authenticate-user,refresh-session,end-session,get-user-profile,update-user-profile}.controller.ts` | Um por rota. |
| `UserPresenter` | `src/infra/http/presenters/user-presenter.ts` | Não expõe o hash da senha. |

## Regras que o código garante

| RN | Onde é aplicada | Como falha |
| -- | --------------- | ---------- |
| RN001 | `User.create`, `Email.create`, `Password.create` e o schema Zod de `CreateUserController` | Campo fora do formato → 422 |
| RN002 | `CreateUserUseCase` e `UpdateUserProfileUseCase`, mais o índice único em `users.email` | `EmailAlreadyInUseError` (409). Na atualização, manter o próprio e-mail é aceito |
| RN003 | `Password.create` | `InvariantError` (422). Vale só no cadastro — não existe outro ponto que receba senha nova |
| RN004 | `AuthenticateUserUseCase` | E-mail inexistente e senha incorreta devolvem o **mesmo** `InvalidCredentialsError` (401), com a mesma mensagem, para não revelar quais e-mails estão cadastrados |
| RN005, RNF005 | `JwtAccessTokenGenerator` + `ACCESS_TOKEN_EXPIRES_IN_SECONDS` | JWT HS256 com o id do usuário em `sub`; autocontido e não persistido |
| RN006 | `RefreshSessionUseCase` + `envSchema` | O bootstrap é derrubado se `REFRESH_TOKEN_EXPIRES_IN_SECONDS` não for maior que o do token de acesso |
| RN007 | `RefreshSessionUseCase` | O token encontrado é revogado **e persistido antes** da emissão do par novo — a ordem é a regra. Token inexistente, vencido, revogado ou já consumido → mesmo `InvalidRefreshTokenError` (401) |
| RN008 | `EndSessionUseCase` | Revoga só a sessão informada; as demais continuam valendo. Responde 204 e é idempotente: inexistente, já revogado, vencido **ou de outro usuário** encerram sem erro |
| RN009 | **Não implementada** | — |
| RN010, RN011 | Perfil sempre pelo token; `EndSessionUseCase` confere o dono do token de renovação | Registro alheio é indistinguível de inexistente. O token de outro usuário não é revogado e a resposta não revela que ele existe |
| RN012, RN013 | **Não implementadas**, mas `deletedAt`, `isDeleted` e a coluna já existem; `GetUserProfileUseCase` e `UpdateUserProfileUseCase` já tratam usuário excluído como inexistente (404) | — |
| RN014 | `DrizzleUsersRepository.findByEmail`, que não filtra excluídos | O e-mail de um usuário excluído continua ocupado |
| RNF006 | `BcryptHasher` | A senha nunca é gravada nem logada em texto |

**Token de renovação:** valor aleatório opaco de 32 bytes em `base64url` — **não** é JWT, porque precisa ser invalidável a qualquer momento (RN007, RN008, RN009, RN013), e um JWT autocontido não permite isso. O que vai para a tabela é o **SHA-256 do token**, nunca o valor entregue ao cliente; a busca posterior usa o mesmo hash.

## Fronteiras

| Domínio | Direção | Ponto de contato | O que rege |
| ------- | ------- | ---------------- | ---------- |
| Todos os demais | Domínio → Usuário | `ownerId` em todo agregado e FK `owner_id` em toda tabela. O identificador chega ao caso de uso pelo `@CurrentUser()`, nunca pelo corpo ou pela URL | RN010, RN011 |
| [Grupos de Contas](account-group.md), [Contas](account.md) | → Usuário | FKs `account_groups.owner_id` e `accounts.owner_id` | RN010 |

O `JwtAuthGuard` global, o `@Public()` e o `@CurrentUser()` consomem a porta `AccessTokenVerifier` deste contexto, mas são política de infraestrutura que vale para o repositório inteiro — estão descritos em `server/CLAUDE.md`, não aqui.

Este contexto não conhece nenhum outro: as setas apontam todas para dentro dele.

## Persistência

Migrations `0001_create_users_table` e `0002_create_refresh_tokens_table`.

| Tabela | Coluna | Observação |
| ------ | ------ | ---------- |
| `users` | `email` | `varchar(254)`, **único** — a unicidade da RN002 é garantida também no banco |
| | `password_hash` | `varchar(255)` |
| | `deleted_at` | Nulo significa ativo; a exclusão lógica ainda não escreve aqui |
| `refresh_tokens` | `token_hash` | `varchar(64)` **único** — SHA-256 em hexadecimal. O token em texto não existe no banco |
| | `user_id` | FK para `users`, indexada |
| | `revoked_at` | Nulo significa ativo; um registro por login |

## Contrato HTTP

| Rota | Público? | Caso de uso | Respostas |
| ---- | -------- | ----------- | --------- |
| `POST /users` | sim (`@Public()`) | `CreateUserUseCase` | 201; 409 e-mail em uso; 422 validação |
| `POST /sessions` | sim (`@Public()`) | `AuthenticateUserUseCase` | 200 com o par de tokens; 401 credenciais inválidas |
| `POST /sessions/refresh` | sim (`@Public()`) | `RefreshSessionUseCase` | 200 com o par novo; 401 token inválido |
| `POST /sessions/logout` | **não** | `EndSessionUseCase` | 204 sempre |
| `GET /users/me` | não | `GetUserProfileUseCase` | 200; 404 inexistente ou excluído |
| `PUT /users/me` | não | `UpdateUserProfileUseCase` | 200; 409 e-mail de outro usuário; 404; 422 |

Não existe rota de perfil por identificador — os dois endpoints de perfil trabalham sempre sobre o usuário do token. A atualização substitui `name` e `email`, ambos obrigatórios, e **não** altera a senha: RN009 tem fluxo próprio.

O cliente precisa guardar o token de renovação devolvido a cada renovação, porque o anterior deixa de valer no mesmo instante (RN007).

## Ainda não existe

| Operação | RN | O que a destrava |
| -------- | -- | ---------------- |
| Alteração de senha | RN009 | Nada. Exige a senha atual e deve revogar os tokens de renovação ativos — o que pede um método novo na porta `RefreshTokensRepository`, que hoje só revoga um por vez |
| Exclusão lógica do usuário | RN012, RN013 | Nada. **Ao implementar, o `AuthenticateUserUseCase` precisa passar a recusar usuário excluído** (RN013): hoje ele não checa `isDeleted`, o que é inofensivo só porque ninguém consegue ser excluído. O `findByEmail` deve continuar sem filtrar excluídos, que é o que sustenta a RN014 |

## Onde tocar

**Campo novo no usuário** → entidade (com a invariante) → `schemas/users.ts` → migration → `DrizzleUserMapper` nos dois sentidos → schema Zod do controller → `UserPresenter` → `test/factories/make-user.ts` → specs.

**Mexer na sessão** → comece pela entidade `RefreshToken`: `isUsable`, `revoke()` e o cálculo da expiração moram lá. Emissão de token novo passa sempre por `RefreshToken.issue`, nunca por `create` com data calculada à mão.

**Trocar algoritmo de hash ou de assinatura** → a porta em `application/services/` não muda; troque a implementação em `src/infra/cryptography/` e o binding no `CryptographyModule`. Nenhum caso de uso é tocado — é exatamente para isso que as portas existem.

**Regra de sessão nova** (revogar todas as sessões, por exemplo) → método novo na porta `RefreshTokensRepository` → implementar nos **dois** repositórios → caso de uso → controller → `HttpModule`.
