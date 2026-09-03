---
id: ADR-0002
title: Erro esperado de negócio é valor de retorno, não exceção
status: accepted
owner: "@DANRLEY-RUAN-SAQUETTI"
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-09-03
relates-to: [ADR-0001, ADR-0004]
supersedes: null
superseded-by: null
---

# ADR-0002 — Erro esperado de negócio é valor de retorno, não exceção

## Contexto

Um caso de uso falha de duas maneiras que não se parecem: a falha **prevista pela regra** — e-mail já em uso, registro não encontrado, credencial inválida — e a falha **inesperada** — banco fora, bug. A primeira faz parte do contrato do caso de uso e o chamador tem o que fazer com ela; a segunda não tem chamador razoável. Tratar as duas pelo mesmo mecanismo apaga a distinção justamente onde ela importa.

## Alternativas consideradas

1. **Exceção para tudo.** Descartada porque o compilador não obriga ninguém a tratá-la: um caso de uso pode passar a falhar de um jeito previsto e nenhum chamador quebra. A falha prevista também fica indistinguível de bug no ponto em que o filtro global classifica.
2. **Retorno `{ ok: boolean, error?, value? }` sem type guard.** Descartada porque não estreita o tipo: o acesso ao valor de sucesso continua possível sem checar `ok`, e a garantia vira disciplina em vez de compilação.
3. **Exceção para a regra e retorno para o inesperado** — o inverso. Descartada por inverter a leitura sem ganho: a falha inesperada é exatamente a que ninguém sabe tratar localmente.

## Decisão

O caso de uso devolve `Either<L, R>`, construído por `left(value)` e `right(value)`, com `isLeft()` e `isRight()` funcionando como type guards. Exceção fica para duas coisas apenas: **invariante de domínio violada** — a entidade lança `InvariantError`, porque um objeto inválido não pode existir — e **falha inesperada**.

## Consequências

### O que se ganha

- O compilador obriga o tratamento antes de o valor de sucesso ser alcançado.
- O erro previsto é parte da assinatura do caso de uso: lê-se o que ele pode recusar sem abrir a implementação.
- O teste unitário afirma sobre um valor de retorno, não sobre uma exceção capturada.

### O que se aceita perder

- `Either` não tem utilitários de composição (`map`, `chain`): encadear casos de uso é feito na mão, com `isLeft()`.
- A borda HTTP tem dois vocabulários de erro — o controller converte `left` em `throw` para que o filtro global responda (ADR-0004) —, o que significa que a distinção some exatamente no lugar onde o cliente a veria.
