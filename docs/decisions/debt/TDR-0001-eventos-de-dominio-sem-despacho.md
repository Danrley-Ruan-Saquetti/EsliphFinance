---
id: TDR-0001
title: AggregateRoot acumula eventos de domínio e nada os despacha
status: open
owner: "@DANRLEY-RUAN-SAQUETTI"
trigger: >
  Quando o gatilho de pagamento abaixo se cumprir.
last-reviewed: 2026-09-03
relates-to: [ADR-0001]
pay-when:
  pattern: 'addDomainEvent\('
  paths: ["server/src/domain/**"]
---

# TDR-0001 — `AggregateRoot` acumula eventos de domínio e nada os despacha

## O atalho

Metade do mecanismo foi construída e testada: `AggregateRoot` mantém a fila `domainEvents` com `addDomainEvent` protegido e `clearDomainEvents` público, e `DomainEvent` declara `occurredAt` e `getAggregateId()`. A outra metade não existe — não há despachante, não há assinante, não há publicação. Uma entidade que emita um evento hoje não provoca nada, e **não há erro, aviso ou teste que denuncie isso**.

## Por que foi aceito

Quando o `core` foi escrito, nenhuma feature dependia de reação a evento. Um barramento sem consumidor seria código morto com superfície de manutenção própria, e escrevê-lo antes de saber quem consome fixaria o formato de entrega (síncrono, transacional, em fila) no pior momento para decidir. Manter só o contrato deixa a forma da entidade pronta sem inventar a infraestrutura.

## Gatilho de pagamento

O primeiro `addDomainEvent(` chamado de dentro de `server/src/domain/`. É o momento em que alguém passa a **contar** com o efeito: até lá o contrato é forma; a partir dali é promessa não cumprida.

## Custo de continuar devendo

O custo é o silêncio. `clearDomainEvents` é público e a fila é observável, então a API sugere um ciclo de publicação que não existe — e quem chamar `clearDomainEvents` achando que publicou não recebe sinal nenhum de que não publicou. Quanto mais tarde, maior a chance de a primeira feature que dependa disso já estar escrita quando se descobrir.
