---
id: TDR-0002
title: O HttpModule é o registro único de todo caso de uso e todo controller
status: open
owner: "@DANRLEY-RUAN-SAQUETTI"
trigger: >
  Quando o gatilho de pagamento abaixo se cumprir.
last-reviewed: 2026-09-03
relates-to: [ADR-0001]
pay-when:
  pattern: '@domain/'
  paths: ["server/src/infra/http/http.module.ts"]
---

# TDR-0002 — O `HttpModule` é o registro único de todo caso de uso e todo controller

## O atalho

Não existe um módulo por contexto de domínio. Todo controller e todo caso de uso são declarados no `HttpModule`, cada caso de uso com o seu `useFactory` e o seu `inject` escritos à mão. A fronteira entre contextos, que existe em `src/domain`, não tem nenhuma representação no grafo de módulos.

## Por que foi aceito

A montagem por `useFactory` decorre de ADR-0001 e não está em questão aqui; o que se aceitou foi **concentrá-la num módulo só**. Com poucos contextos, um módulo por contexto seria cerimônia sem separação real, e a fronteira certa entre eles ainda não estava clara o bastante para ser congelada em arquivo.

## Gatilho de pagamento

O primeiro import de `@domain/` dentro de `server/src/infra/http/http.module.ts`. É quando a fatia de domínio volta a existir e a forma do registro passa a ser escolhida na prática — o momento mais barato para decidir, porque cada caso de uso registrado depois é um a mais para mover.

## Custo de continuar devendo

O arquivo cresce a cada feature e é ponto de conflito garantido em merge: duas pessoas trabalhando em contextos diferentes editam a mesma lista. Além disso, o grafo de módulos deixa de contar onde está a fronteira do domínio — que é a informação que se busca nele —, e um caso de uso passa a poder injetar a porta de um contexto vizinho sem que nada indique que ele atravessou uma fronteira.
