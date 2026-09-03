---
id: ADR-0006
title: Toda rota nasce autenticada; abrir uma rota é ato explícito
status: accepted
owner: "@DANRLEY-RUAN-SAQUETTI"
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-09-03
relates-to: [RN-0010, RN-0011, RNF-0005, ADR-0007]
supersedes: null
superseded-by: null
---

# ADR-0006 — Toda rota nasce autenticada; abrir uma rota é ato explícito

## Contexto

RN-0010 e RN-0011 dizem que todo registro pertence a um usuário e só pode ser lido ou alterado por ele. Isso torna a rota autenticada o caso comum e a rota pública a exceção — cadastro, login, renovação e sonda de disponibilidade. A decisão é sobre qual dos dois erros o mecanismo torna difícil: esquecer de proteger, ou esquecer de abrir.

## Alternativas consideradas

1. **Proteger rota a rota com `@UseGuards()` no controller.** Descartada porque o esquecimento produz uma rota **aberta**: o erro caro, silencioso, que não aparece em nenhum teste de caminho feliz.
2. **Allowlist de rotas públicas em arquivo de configuração.** Descartada porque a lista fica longe do controller e envelhece sozinha — uma rota renomeada continua na lista, apontando para nada, e ninguém percebe.

## Decisão

O `JwtAuthGuard` é registrado como `APP_GUARD` pelo `AuthModule`, então **toda rota nasce autenticada**. Abrir uma rota é um ato explícito, com `@Public()` no controller ou no handler. O guard exige `Authorization: Bearer <token de acesso>`, valida pela porta `AccessTokenVerifier` e anexa `{ id }` à requisição; o controller lê o usuário por `@CurrentUser()`. **Quem confere a propriedade do registro é o caso de uso, nunca o guard**, e o identificador do dono nunca vem do cliente.

## Consequências

### O que se ganha

- O erro caro exige um ato deliberado; o erro barato — rota protegida que deveria ser pública — aparece no primeiro teste.
- O `@Public()` fica ao lado da rota, então a lista de rotas públicas não pode envelhecer separada delas.
- O guard cobre a aplicação inteira pelo simples fato de o `AuthModule` estar no grafo, sem que nenhum módulo precise exportar nada.

### O que se aceita perder

- O `@Public()` fica espalhado pelos controllers, e não há um lugar onde a lista completa de rotas públicas se leia de uma vez.
- Um controller novo que devesse ser público só falha quando alguém o exercita — em produção, se ninguém escreveu o teste.
- O guard não autoriza nada além de autenticar: a conferência de dono é repetida em cada caso de uso que lê ou altera registro. A repetição é deliberada, mas é repetição, e ela não é cobrada por compilador nenhum.
