# Arquitetura da plataforma

> **Cobre** `server/src/core` e o `server/src/infra` transversal · **Requisitos** RNF-0002 · RNF-0003 · RNF-0004 · RNF-0005 · RNF-0006 · RNF-0007 · RN-0010 · RN-0011

Este diretório descreve **o que sustenta todos os domínios** do backend: as camadas, os blocos de construção de `core/`, o wiring do Nest e a infraestrutura que atende a qualquer contexto. O que está dentro de um contexto de `src/domain` — entidades, casos de uso, regras de conta ou de usuário — ainda não tem documento: `docs/domains/` foi removido junto com a fatia de domínio e volta com ela, um arquivo por contexto.

A divisão prática: se o fato vale para contas **e** para usuários **e** para o próximo contexto que entrar, ele mora aqui; se vale só para um, mora lá.

## Camadas e a regra de dependência

As setas apontam sempre para dentro. O domínio não conhece ninguém; a aplicação conhece o domínio; a infraestrutura conhece as duas e implementa as portas que elas declaram.

```
Infra (HTTP, Drizzle, Auth, Cryptography, Env)  →  Application (use-cases, ports)  →  Domain (entities, VOs)
```

NestJS, Drizzle, Express e Zod são detalhes de infraestrutura e **não podem vazar** para dentro: nada de `@Injectable()`, `drizzle-orm` ou tipos de `express` em entidade ou caso de uso. O que torna isso verificável é o import — um `@nestjs/*` ou `drizzle-orm` dentro de `src/core` ou `src/domain` é violação, sem exceção conhecida hoje. A decisão, com as alternativas descartadas e o que ela custa, está em ADR-0001.

## Os eixos

| Documento | O que responde |
| --------- | -------------- |
| [`request-lifecycle.md`](request-lifecycle.md) | Como uma requisição atravessa a aplicação, do middleware ao presenter, e como qualquer erro vira resposta HTTP |
| [`modules-and-di.md`](modules-and-di.md) | Quais módulos existem, o que cada um provê, e por que caso de uso é instanciado por `useFactory` em vez de `@Injectable()` |
| [`core-building-blocks.md`](core-building-blocks.md) | `Entity`, `AggregateRoot`, `UniqueEntityID`, `ValueObject`, `Money`, `Either`, `UseCase`, `BaseError` — o que cada bloco garante e como se estende |
| [`persistence.md`](persistence.md) | `DrizzleService` e o pool, schemas como fonte das migrations, mappers, repositórios Drizzle e in-memory |
| [`security.md`](security.md) | Rota protegida por padrão, `@Public()`, `@CurrentUser()`, isolamento por usuário, CORS, helmet, HTTPS/HSTS |
| [`configuration.md`](configuration.md) | Como uma variável de ambiente é declarada, validada e lida, e o que o schema endurece em produção |

## O que é global

Quatro coisas rodam sem ninguém declarar, e é a lista completa hoje:

| Registro | Onde | Efeito |
| -------- | ---- | ------ |
| `APP_FILTER` → `AllExceptionsFilter` | `infra/http/http.module.ts` | Toda exceção vira o mesmo formato de resposta |
| `APP_GUARD` → `JwtAuthGuard` | `infra/auth/auth.module.ts` | Toda rota nasce autenticada; abrir exige `@Public()` |
| `EnvModule` marcado `@Global()` | `infra/env/env.module.ts` | `EnvService` é injetável em qualquer módulo sem import |
| Cadeia de middlewares em `forRoutes('*')` | `infra/http/http.module.ts` | CORS, headers de segurança, `x-request-id` e redirecionamento HTTPS em toda rota |

Não há `APP_PIPE` nem `APP_INTERCEPTOR`: a validação é por rota (ver [`request-lifecycle.md`](request-lifecycle.md)) e não existe interceptor nenhum.

## Ainda não existe

| Ausente | Consequência |
| ------- | ------------ |
| Interceptor de log estruturado por requisição | Só o erro 5xx é logado, pelo `AllExceptionsFilter`; não há log de acesso nem de latência — TDR-0003 |
| Despacho de eventos de domínio | `AggregateRoot` acumula eventos em `domainEvents`, mas nada os consome ou publica — TDR-0001 |
| Transação de banco atravessando repositórios | Cada repositório opera por conta própria; não há unidade de trabalho |
| Cache, fila ou job agendado | Nenhum dos três existe — repetições e notificações previstas nos requisitos ainda não têm mecanismo |
| Versionamento e documentação da API | Sem prefixo de versão nas rotas e sem OpenAPI |

## Por que, e o que se deve de propósito

Este diretório descreve **o que está construído**. O **porquê** de cada escolha custosa de reverter — com as alternativas descartadas e o que se aceita perder — mora em [`../adr/`](../adr/), e o que se assumiu dever de propósito, com o gatilho de pagamento, em [`../decisions/debt/`](../decisions/debt/). Os documentos acima citam o ADR ou o TDR em vez de repetir o raciocínio.

| Decisão | Onde ela aparece aqui |
| ------- | --------------------- |
| ADR-0001 — domínio e aplicação sem NestJS | [`modules-and-di.md`](modules-and-di.md), [`persistence.md`](persistence.md) |
| ADR-0002 — erro de negócio é retorno, não exceção | [`core-building-blocks.md`](core-building-blocks.md) |
| ADR-0003 — dinheiro como inteiro em centavos | [`core-building-blocks.md`](core-building-blocks.md) |
| ADR-0004 — contrato de erro único | [`request-lifecycle.md`](request-lifecycle.md) |
| ADR-0005 — validação por parâmetro | [`request-lifecycle.md`](request-lifecycle.md) |
| ADR-0006 — rota autenticada por padrão | [`security.md`](security.md) |
| ADR-0007 — resposta que não distingue o caso | [`security.md`](security.md) |
| ADR-0008 — token de renovação opaco | [`security.md`](security.md) |
| ADR-0009 — schema Drizzle como fonte das migrations | [`persistence.md`](persistence.md), [`configuration.md`](configuration.md) |
| ADR-0010 — segunda implementação in-memory | [`persistence.md`](persistence.md) |
| TDR-0001 — eventos de domínio sem despacho | [`core-building-blocks.md`](core-building-blocks.md) |
| TDR-0002 — `HttpModule` registra todo caso de uso | [`modules-and-di.md`](modules-and-di.md) |
| TDR-0003 — API sem registro de acesso | [`request-lifecycle.md`](request-lifecycle.md) |

## Fora deste diretório

Execução, Docker, `Makefile`, CI e workflows não são cobertos aqui — estão no [`server/CLAUDE.md`](../../server/CLAUDE.md). Padrão de escrita de testes é da skill `spec-writer`; estilo de código é da `clean-code`; requisitos e regras de negócio são da `business-analyst`, em [`../requirements/rules.md`](../requirements/rules.md).
