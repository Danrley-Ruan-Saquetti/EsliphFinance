# Ciclo de vida da requisição

> **Cobre** `server/src/infra/http` · **Requisitos** RNF-0007 · RN-0011

Da chegada da requisição à resposta, incluindo o caminho de erro. Toda resposta de erro da API — validação, regra de negócio ou falha inesperada — sai no mesmo formato, e há um único lugar que a produz.

## O caminho de sucesso

| Etapa | Onde | O que decide |
| ----- | ---- | ------------ |
| 1. Middlewares | `http.module.ts`, `configure(consumer)` | Transporte: origem, headers de segurança, `x-request-id`, HTTPS |
| 2. Guard | `infra/auth/jwt-auth-guard.ts` | Se a rota é pública; senão valida o Bearer e anexa `{ id }` à requisição |
| 3. Decorator de parâmetro | `@CurrentUser()`, `infra/auth/current-user-decorator.ts` | Entrega o usuário autenticado ao controller |
| 4. Pipe | `new ZodValidationPipe(schema)` no parâmetro | Valida e **transforma** o corpo, query ou param |
| 5. Controller | `infra/http/controllers/` | Traduz HTTP ↔ caso de uso; nenhuma regra |
| 6. Caso de uso | `domain/<ctx>/application/use-cases/` | A regra de negócio; devolve `Either` |
| 7. Presenter | `infra/http/presenters/` | Entidade → JSON de resposta |

O controller é fino de propósito e tem uma forma fixa: executa o caso de uso, e se o resultado for `left` **lança o erro** em vez de montar resposta. Quem traduz erro em status é o filtro global, um lugar só.

```ts
const result = await this.createAccount.execute({ ...body, ownerId: currentUser.id })

if (result.isLeft()) {
  throw result.value
}
```

O spread antes do `ownerId` não é estilo: garante que o identificador do token vença uma chave repetida vinda do corpo. Ver [`security.md`](security.md).

## Middlewares, em ordem

A cadeia é aplicada em `forRoutes('*')` e a ordem é comportamento:

| # | Middleware | O que faz | Por que nesta posição |
| - | ---------- | --------- | --------------------- |
| 1 | `CorsMiddleware` | Política a partir de `CORS_ORIGINS`; métodos e headers permitidos fixos; `credentials: false`; expõe `x-request-id`; preflight cacheado por 24 h | Precisa responder ao preflight antes de qualquer coisa poder rejeitá-lo |
| 2 | `SecurityHeadersMiddleware` | helmet com CSP `default-src 'none'` e `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Cross-Origin-Resource-Policy: same-origin`; HSTS só com `ENFORCE_HTTPS` ligado | Os headers precisam valer inclusive na resposta de redirecionamento |
| 3 | `RequestIdMiddleware` | Aceita `x-request-id` do cliente (se não for vazio) ou gera um UUID; grava no header da requisição **e** no da resposta | Tem que vir antes de qualquer resposta que queira carregar o identificador |
| 4 | `HttpsRedirectMiddleware` | Com `ENFORCE_HTTPS`, decide por `x-forwarded-proto` (primeiro valor da lista) e cai para `request.secure`; requisição insegura vira **308**; sem header `Host`, lança `InsecureTransportError` (403) | É o único que interrompe a requisição, então roda por último na cadeia de transporte |

O 308 é escolhido em vez de 301/302 porque preserva método e corpo — um `POST` redirecionado continua `POST`. A decisão vem do `x-forwarded-proto` porque o TLS termina no proxy; o proxy é obrigado a sobrescrever esse header, senão o cliente o forja.

`credentials: false` no CORS é consequência da autenticação ser por Bearer token (RNF-0005), não por cookie de navegador.

## Validação de entrada

O `ZodValidationPipe` recebe o schema no **construtor** e é aplicado **por parâmetro**, não globalmente:

```ts
@Body(new ZodValidationPipe(createAccountBodySchema)) body: CreateAccountBody
```

Isso permite que um controller valide corpo, query e params com schemas diferentes, e que o schema viva ao lado do controller que o usa. O tipo do parâmetro sai do próprio schema (`z.infer`), então a validação e o tipo nunca divergem.

Duas consequências que não estão no nome do arquivo:

- **O pipe transforma, não só valida.** `moneySchema` devolve um `Money`, não um número — o controller já recebe o Value Object pronto. Ver [`core-building-blocks.md`](core-building-blocks.md).
- **As mensagens saem em português sem esforço**, porque o pipe passa o locale `z.locales.pt()` em cada `safeParse`. Mensagem customizada escrita em schema também é em português, por convenção do repositório.

Validação de entrada **não substitui** a invariante do domínio: o schema recusa o que é malformado, a entidade recusa o que é inválido como negócio. Ver [`core-building-blocks.md`](core-building-blocks.md).

## O caminho de erro

O `AllExceptionsFilter` (`@Catch()` sem argumento, registrado como `APP_FILTER` no `HttpModule`) é o único ponto que traduz exceção em resposta. Ele classifica nesta ordem:

| Ordem | Exceção | Resposta |
| ----- | ------- | -------- |
| 1 | `ValidationError` | Status do mapa de códigos + `details` com um item por issue do Zod |
| 2 | Qualquer `BaseError` | Status do mapa de códigos, `code` e mensagem do próprio erro |
| 3 | `HttpException` do Nest | O status da própria exceção; o `code` vira o nome do status (`NOT_FOUND`) |
| 4 | Qualquer outra coisa | 500, `INTERNAL_SERVER_ERROR` |

O corpo é sempre o mesmo (`infra/http/errors/error-response.ts`):

```json
{
  "statusCode": 422,
  "code": "VALIDATION_FAILED",
  "message": "Falha na validação",
  "details": [{ "field": "ownerId", "message": "UUID inválido" }],
  "path": "/accounts",
  "timestamp": "2026-07-28T12:00:00.000Z",
  "requestId": "6d0f1a1e-2b6b-4a5f-9a0e-2f2b0e7d51c3"
}
```

- `code` é o `code` estável do `BaseError`, em inglês, e é **o que o cliente deve consumir** para decidir o que fazer — nunca a mensagem, que é texto de apresentação e muda.
- `message` e `details[].message` são em português, prontos para exibição.
- `details` só aparece em erro de validação; `field` é o caminho do campo (`creditCard.limit`) ou, quando o erro não é de um campo específico, a origem do argumento (`body`, `query`).
- Status ≥ 500 nunca devolve a mensagem original nem stack: o corpo traz `Erro interno do servidor` e o stack vai só para o log, com método, rota, status e `requestId`. Erros 4xx não são logados.

### Mapa código → status

Em `infra/http/errors/http-status-by-error-code.ts`. Código sem entrada no mapa cai em **400**.

| `code` | Status | Origem |
| ------ | ------ | ------ |
| `VALIDATION_FAILED` | 422 | `ValidationError`, lançado pelo `ZodValidationPipe` |
| `INVARIANT_VIOLATION` | 422 | `InvariantError`, lançado pela entidade ou Value Object |
| `UNAUTHENTICATED` | 401 | `UnauthenticatedError`, do guard e do `@CurrentUser()` |
| `INVALID_CREDENTIALS` | 401 | Login com e-mail ou senha errados (RN-0004) |
| `INVALID_REFRESH_TOKEN` | 401 | Renovação com token inexistente, vencido ou já usado (RN-0007) |
| `RESOURCE_NOT_FOUND` | 404 | Registro inexistente **ou de outro usuário** (RN-0011) |
| `NOT_ALLOWED` | 403 | Operação proibida sobre registro próprio |
| `INSECURE_TRANSPORT` | 403 | `HttpsRedirectMiddleware` sem `Host` para onde redirecionar |
| `EMAIL_ALREADY_IN_USE` | 409 | Conflito de e-mail no cadastro e na alteração de perfil |

Erro de negócio novo: herde de `BaseError` com um `code` estável em inglês, escreva a mensagem em português no ponto em que é lançado, e acrescente a entrada aqui **se 400 não servir**.

### O `requestId` em erro

O filtro lê o `x-request-id` do header da requisição — que o `RequestIdMiddleware` já gravou lá — e, se não encontrar, gera um UUID novo. A consequência: se a exceção acontecer **antes** do terceiro middleware rodar, o `requestId` do corpo não é o mesmo que o cliente enviou nem o que voltou no header. Na prática isso só alcança falha dentro do CORS ou dos headers de segurança.

## Ainda não existe

| Ausente | Consequência |
| ------- | ------------ |
| Interceptor de log de acesso | Requisição bem-sucedida não deixa registro nenhum |
| Prefixo de versão nas rotas | Mudança incompatível não tem para onde ir |
| Paginação padronizada | Cada listagem devolve a coleção inteira |
| Documentação OpenAPI | O contrato só existe no código e neste documento |
