---
id: ADR-0010
title: Toda porta de repositório tem uma segunda implementação in-memory
status: accepted
owner: "@DANRLEY-RUAN-SAQUETTI"
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-09-03
relates-to: [ADR-0001, ADR-0009]
supersedes: null
superseded-by: null
---

# ADR-0010 — Toda porta de repositório tem uma segunda implementação in-memory

## Contexto

O caso de uso depende de uma porta abstrata e nunca sabe qual implementação recebeu (ADR-0001). Falta decidir o que o teste unitário injeta no lugar do repositório Drizzle — e essa escolha determina se a porta é exercitada como contrato ou se cada teste inventa o comportamento que lhe convém.

## Alternativas consideradas

1. **Mock ou stub montado por spec.** Descartada porque cada teste passa a definir o seu próprio comportamento da porta: dois specs podem assumir semânticas incompatíveis para o mesmo método, e a porta nunca é exercitada inteira.
2. **Banco real no teste unitário.** Descartada pelo custo por teste e pelo acoplamento ao Docker: o unitário deixaria de rodar sem stack de pé, e a distinção entre unitário e e2e desapareceria.
3. **Uma implementação in-memory genérica, dirigida por metadata.** Descartada porque a parte cara de um repositório é justamente a consulta específica — filtro, ordenação, junção —, que é o que uma implementação genérica não sabe reproduzir.

## Decisão

Toda porta tem duas implementações: `Drizzle*Repository`, ligada à porta no `DatabaseModule` e usada em produção, e `InMemory*Repository`, montada à mão no spec e **não registrada em módulo nenhum**. As duas usam `extends` sobre a classe abstrata, não `implements`, para que o compilador cobre a assinatura completa em ambas. Ordenação e filtros fazem parte do contrato da porta e precisam bater nas duas.

## Consequências

### O que se ganha

- O teste unitário roda sem banco, sem Docker e sem ambiente.
- O in-memory é o segundo implementador de cada porta, e é o que denuncia quando uma porta está pedindo demais — uma porta difícil de implementar em memória é uma porta que vazou SQL.
- Trocar a implementação é trocar uma linha do módulo, o que é o que torna ADR-0001 verificável na prática.

### O que se aceita perder

- Duas implementações a manter em sincronia, para sempre, a cada método novo.
- Divergência de ordenação ou de filtro **passa no unitário e só falha no e2e** — o formato de falha mais caro de diagnosticar que este repositório aceita.
- O in-memory carrega acoplamento próprio: onde a consulta Drizzle faz junção, ele precisa receber o repositório vizinho no construtor. Isso é conhecimento que não está na porta, e quem não souber não monta o spec.
