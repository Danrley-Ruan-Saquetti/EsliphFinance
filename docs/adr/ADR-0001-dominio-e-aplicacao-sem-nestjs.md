---
id: ADR-0001
title: Domínio e aplicação não conhecem o NestJS
status: accepted
owner: "@DANRLEY-RUAN-SAQUETTI"
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-09-03
relates-to: [RNF-0002]
supersedes: null
superseded-by: null
---

# ADR-0001 — Domínio e aplicação não conhecem o NestJS

## Contexto

O backend é NestJS (RNF-0002), e o Nest pede que tudo que ele instancia carregue um decorator seu. Aceitar isso levaria `@nestjs/common` para dentro da entidade e do caso de uso — a camada que precisa sobreviver à troca de framework e ser testável sem container. A pergunta que a decisão fecha é como a aplicação recebe as suas dependências sem importar quem as monta.

## Alternativas consideradas

1. **`@Injectable()` no caso de uso, com o Nest resolvendo por metadata de construtor.** É o caminho de menor atrito e o que a documentação do framework ensina. Descartada porque o decorator é um import do Nest dentro da camada de aplicação: o teste unitário passa a depender de um módulo de teste do Nest para instanciar um caso de uso, e a regra "framework não vaza" deixa de ser verificável por import.
2. **Token de injeção por `string` ou `Symbol`, com `@Inject('UsersRepository')` no construtor.** Descartada por dois motivos: `@Inject` é o mesmo import do Nest que a alternativa 1 traz, e o token deixa de ser um tipo — errar o nome vira erro de execução em vez de erro de compilação.
3. **Container de injeção próprio, escrito no `core`.** Descartada por custo: reimplementa o que o Nest já faz, para ganhar apenas a ausência de um import que a decisão adotada já evita.

## Decisão

Nenhum arquivo de `src/core` ou `src/domain` importa `@nestjs/*`, `drizzle-orm` ou tipos de `express`; a porta é uma **classe abstrata declarada no domínio e é o próprio token de injeção**; o caso de uso é montado por `useFactory` com `inject` no módulo de infraestrutura, e recebe **valores** de configuração já resolvidos, nunca o `EnvService`.

## Consequências

### O que se ganha

- Caso de uso instanciável com `new` no teste, sem container e sem ambiente.
- A implementação é trocada na ligação do módulo — Drizzle em produção, in-memory no teste — sem tocar no código de produção (ADR-0010).
- A violação é detectável mecanicamente: um `@nestjs/*` ou `drizzle-orm` sob `src/core` ou `src/domain` é o erro, sem exceção conhecida.
- O token é um tipo, então o compilador cobra a assinatura completa da implementação.

### O que se aceita perder

- Cada caso de uso é registrado à mão, com `useFactory` e `inject` — repetição que cresce linearmente com o número de casos de uso.
- A ordem de `inject` é posicional e não é verificada pelo compilador: trocar duas dependências do mesmo tipo compila e quebra em execução.
- O registro concentrado que isso produz é dívida declarada em TDR-0002.
