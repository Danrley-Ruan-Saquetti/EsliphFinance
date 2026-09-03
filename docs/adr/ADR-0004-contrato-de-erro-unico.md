---
id: ADR-0004
title: Um único filtro traduz exceção em resposta, com code em inglês e mensagem em português
status: accepted
owner: "@DANRLEY-RUAN-SAQUETTI"
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-09-03
relates-to: [ADR-0001, ADR-0002, ADR-0007, RNF-0001]
supersedes: null
superseded-by: null
---

# ADR-0004 — Um único filtro traduz exceção em resposta, com `code` em inglês e mensagem em português

## Contexto

O cliente é um aplicativo mobile (RNF-0001) e precisa decidir o que fazer diante de um erro sem interpretar texto. Ao mesmo tempo, a convenção do repositório é que todo texto exibido ao usuário sai em português. As duas exigências puxam para lados opostos dentro do mesmo corpo de resposta, e sem um lugar único que o monte cada controller resolve o conflito à sua maneira.

## Alternativas consideradas

1. **Cada controller monta a sua resposta de erro.** Descartada porque diverge no primeiro controller novo: a forma do corpo passa a ser convenção não verificada, e o cliente ganha um caso especial por rota.
2. **Lançar `HttpException` do Nest a partir do caso de uso.** Descartada porque leva `@nestjs/common` para dentro da camada de aplicação, contra ADR-0001.
3. **Usar a mensagem como identificador do erro, dispensando o `code`.** Descartada porque amarra o cliente a texto de apresentação: corrigir uma vírgula na mensagem quebraria o cliente.

## Decisão

O `AllExceptionsFilter`, registrado como `APP_FILTER`, é o **único** ponto que traduz exceção em resposta. O corpo é sempre o mesmo — `statusCode`, `code`, `message`, `details`, `path`, `timestamp`, `requestId`. O `code` é estável e em inglês, e **é o que o cliente consome**; `message` e `details[].message` são em português, prontos para exibição. `ResourceNotFoundError` e `NotAllowedError` recebem a **frase inteira**, não um nome de recurso interpolado, porque é isso que faz a concordância de gênero sair certa em português. Resposta com status ≥ 500 nunca devolve a mensagem original nem stack.

## Consequências

### O que se ganha

- Uma forma de corpo só, para toda origem de erro — validação, regra de negócio, falha inesperada.
- O cliente programa contra `code`, e a mensagem fica livre para melhorar sem quebrar ninguém.
- Detalhe interno não vaza em 5xx, e o `requestId` liga a resposta ao log.

### O que se aceita perder

- A mensagem não é montada por template, então frases equivalentes se repetem entre casos de uso e podem divergir entre si.
- Um `code` novo sem entrada no mapa de status cai silenciosamente em 400 — a omissão não é erro, é um status errado.
- Erros 4xx não são logados: o diagnóstico de um 4xx depende de o cliente relatar o `requestId`, que do lado do servidor hoje não encontra nada (TDR-0003).
