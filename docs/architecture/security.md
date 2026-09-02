# Segurança

> **Cobre** `server/src/infra/auth` e `server/src/infra/cryptography` · **Requisitos** RNF-0005 · RNF-0006 · RNF-0007 · RN-0004–RN-0011

Quem é o usuário da requisição, o que ele pode alcançar, e com que primitivas isso é garantido. O comportamento de cada rota de sessão — emissão do par de tokens, rotação, encerramento — é do contexto de usuários, que volta a ser documentado em `docs/domains/user.md` quando a fatia de domínio voltar. Os headers de transporte e o redirecionamento HTTPS estão em [`request-lifecycle.md`](request-lifecycle.md).

## Rota protegida por padrão

`JwtAuthGuard` é registrado como `APP_GUARD` pelo `AuthModule`, então **toda rota nasce autenticada**. A inversão é deliberada: RN-0010 e RN-0011 dizem que todo registro pertence a um usuário, e uma rota aberta por esquecimento é o erro caro — o outro sentido do erro, uma rota protegida que deveria ser pública, aparece no primeiro teste.

Abrir uma rota é um ato explícito, com `@Public()` no controller ou no handler. Os únicos públicos hoje, e o motivo de cada um:

| Rota | Controller | Por que é pública |
| ---- | ---------- | ----------------- |
| `GET /status` | `HealthController` | Sonda de disponibilidade; não devolve dado nenhum |
| `POST /users` | `CreateUserController` | Cadastro — existe para quem ainda não tem credencial |
| `POST /sessions` | `AuthenticateUserController` | Login (RN-0004) |
| `POST /sessions/refresh` | `RefreshSessionController` | Renovação sem credencial (RN-0006) |

`POST /sessions/logout` **não** é público: encerrar sessão exige estar autenticado.

O guard exige `Authorization: Bearer <token de acesso>`, valida pela porta `AccessTokenVerifier` e anexa `{ id }` à requisição. Header ausente, esquema diferente de `Bearer`, assinatura inválida, token vencido e payload com `sub` que não seja UUID devolvem todos o **mesmo** `UnauthenticatedError` (401) — a indistinção é intencional, para não informar a quem sonda qual das condições falhou.

O controller lê o usuário por `@CurrentUser()`, que devolve o `AuthenticatedUser` anexado pelo guard e lança `UnauthenticatedError` se ele não estiver lá. Esse segundo lançamento cobre o caso de alguém usar `@CurrentUser()` em rota marcada `@Public()`.

O identificador entra no caso de uso como qualquer outro dado de entrada: **quem confere a propriedade do registro é o caso de uso, nunca o guard**.

## Isolamento dos registros por usuário (RN-0010, RN-0011)

O dono de um registro **nunca** vem do cliente. Não existe `ownerId` em corpo, query ou path; o identificador chega pelo `@CurrentUser()`. Aceitá-lo do cliente seria deixar qualquer usuário autenticado escrever no acervo alheio.

Duas camadas garantem isso, e as duas são obrigatórias:

1. O schema Zod não declara o campo, então o pipe descarta um `ownerId` que venha no corpo.
2. O controller monta o objeto com **o spread antes do valor do token** — `{ ...body, ownerId: currentUser.id }`, nunca o inverso —, de modo que o dono do token vença a chave repetida mesmo que ela chegue lá.

A ordem importa porque a primeira camada pode mudar sem que ninguém se lembre da segunda.

Acesso a registro de outro usuário responde **`ResourceNotFoundError` (404)**, com a mesma mensagem do registro que não existe — nunca 403. Um 403 confirmaria que aquele identificador existe e pertence a alguém, e essa diferença é enumerável: o cliente legítimo não ganha nada com ela, e quem sonda o acervo alheio ganha um oráculo. Na prática o caso de uso reúne as duas condições em uma guard clause só:

```ts
const account = await this.accountsRepository.findById(accountId)

if (!account || !this.isOwnedBy(account, ownerId)) {
  return left(new ResourceNotFoundError('Conta não encontrada'))
}
```

`NotAllowedError` (403) fica reservado para a operação que o dono não pode executar sobre o que é dele — nunca para propriedade, que é sempre 404.

Todo caso de uso que lê ou altera registro entra com teste de acesso cruzado entre dois usuários, citando RN-0010 e RN-0011 no nome, no unitário e no e2e.

## Primitivas criptográficas

Todas ficam atrás de portas declaradas no domínio; `CryptographyModule` exporta as portas, nunca as implementações.

| Porta | Implementação | Como funciona |
| ----- | ------------- | ------------- |
| `HashGenerator`, `HashComparer` | `BcryptHasher` | bcrypt com 10 rounds; hash irreversível de senha (RNF-0006). Uma instância só atende às duas portas, via `useExisting` |
| `AccessTokenGenerator` | `JwtAccessTokenGenerator` | Assina HS256 com `JWT_SECRET`, expiração de `ACCESS_TOKEN_EXPIRES_IN_SECONDS` (RN-0005) |
| `AccessTokenVerifier` | `JwtAccessTokenVerifier` | Verifica assinatura e expiração e **valida o payload com Zod** (`sub` precisa ser UUID); qualquer falha vira `null`, sem propagar exceção da biblioteca |
| `RefreshTokenGenerator` | `CryptoRefreshTokenGenerator` | 32 bytes aleatórios em `base64url` para o token, e SHA-256 para o valor guardado |

O token de renovação **não é JWT**: é um segredo opaco, e o banco guarda apenas o SHA-256 dele. Quem vazar a tabela não consegue renovar sessão. É também o que permite invalidar o token na rotação (RN-0007) e no logout (RN-0008) — algo que um JWT autocontido não permitiria sem uma lista de revogados.

O segredo tem mínimo de 32 caracteres, cobrado pelo `envSchema` no bootstrap. Ver [`configuration.md`](configuration.md).

## Ainda não existe

| Ausente | Consequência |
| ------- | ------------ |
| Limite de tentativas de login e rate limiting | Nada freia força bruta em `POST /sessions` |
| Papéis ou permissões além de "dono" | `NotAllowedError` existe, mas não há nada que o produza por papel |
| Rotação do `JWT_SECRET` | Trocar o segredo invalida todos os tokens de acesso de uma vez |
| Auditoria de acesso | Não há registro de quem leu ou alterou o quê |
