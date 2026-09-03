---
id: ADR-0005
title: Validação de entrada por parâmetro com ZodValidationPipe, não por pipe global
status: accepted
owner: "@DANRLEY-RUAN-SAQUETTI"
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-09-03
relates-to: [ADR-0003, ADR-0004]
supersedes: null
superseded-by: null
---

# ADR-0005 — Validação de entrada por parâmetro com `ZodValidationPipe`, não por pipe global

## Contexto

Toda entrada da API precisa ser recusada quando malformada, e o tipo que o controller manipula precisa ser o mesmo que foi validado — senão a validação e o tipo divergem em silêncio na primeira alteração. Um controller pode ainda precisar de esquemas diferentes para corpo, query e parâmetro de rota na mesma rota.

## Alternativas consideradas

1. **`ValidationPipe` global do Nest com DTOs de classe e `class-validator`.** Descartada porque cria duas fontes para a mesma verdade — a propriedade da classe e o decorator de validação — e o tipo não deriva da regra: alterar a validação sem alterar o tipo continua compilando.
2. **`ZodValidationPipe` registrado como `APP_PIPE`, resolvendo o schema por metadata.** Descartada porque exigiria um registro paralelo de schema por rota: o mesmo acoplamento, com um passo a mais e mais longe do controller.
3. **Validar dentro do caso de uso.** Descartada porque confunde dois níveis: o schema recusa o que é malformado, a entidade recusa o que é inválido como negócio, e juntá-los levaria a forma do HTTP para dentro do domínio.

## Decisão

O `ZodValidationPipe` recebe o schema no **construtor** e é aplicado **por parâmetro** — `@Body(new ZodValidationPipe(createAccountBodySchema))`. O tipo do parâmetro sai do próprio schema por `z.infer`, e o pipe **transforma**, não só valida: `moneySchema` entrega um `Money` ao controller (ADR-0003). As mensagens saem em português porque o pipe passa o locale `z.locales.pt()` em cada `safeParse`.

## Consequências

### O que se ganha

- O schema vive ao lado do controller que o usa, e corpo, query e param podem ter esquemas diferentes.
- Validação e tipo não divergem: um deriva do outro.
- A mensagem em português sai sem esforço por rota, e o erro vira `VALIDATION_FAILED` com um `details` por issue (ADR-0004).

### O que se aceita perder

- `new ZodValidationPipe(...)` se repete em cada parâmetro de cada controller.
- **Nada obriga um controller novo a validar.** A ausência do pipe não é erro de compilação nem de execução: é uma rota que aceita qualquer coisa, e só a revisão ou o teste pega.
- A mesma restrição pode aparecer duas vezes — no schema e na invariante da entidade — e as duas precisam ser mantidas coerentes à mão.
