---
id: ADR-0003
title: Dinheiro é inteiro em centavos encapsulado no Value Object Money
status: accepted
owner: "@DANRLEY-RUAN-SAQUETTI"
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-09-03
relates-to: [RNF-0004, RN-0065]
supersedes: null
superseded-by: null
---

# ADR-0003 — Dinheiro é inteiro em centavos encapsulado no Value Object `Money`

## Contexto

RNF-0004 exige valor monetário armazenado como inteiro em centavos, com duas casas apenas na exibição. O requisito diz **o quê**; sobra decidir **como** o valor atravessa a aplicação sem que alguém, em algum ponto, o transforme num `number` fracionário — e onde mora a única regra de arredondamento, já que RN-0065 exige que a diferença do rateio caia numa parcela específica.

## Alternativas consideradas

1. **`numeric`/`decimal` do Postgres com `number` no código.** Descartada porque o driver devolve `string` para preservar a precisão, e converter para `number` reintroduz exatamente o ponto flutuante que a decisão quer evitar — a precisão do banco não sobrevive à borda.
2. **Biblioteca de decimal (`decimal.js` e afins).** Descartada por trazer uma dependência para um problema que o inteiro já resolve, sem resolver o que é de fato difícil: a regra de rateio da RN-0065 continuaria sendo escrita à mão.
3. **`number` cru em centavos, sem Value Object.** Descartada porque nada impede um fracionário de circular representando dinheiro, e o arredondamento passa a ser reescrito em cada lugar que multiplica.

## Decisão

Todo valor monetário é um `Money` imutável, inteiro em centavos, criado por `Money.fromCents(n)` ou `Money.zero()`; qualquer coisa que não seja inteiro seguro lança `InvariantError`. As três bordas são fixas: entrada por `moneySchema`, que **já transforma** em `Money`; persistência pela coluna `moneyAmount(name)`, `bigint` com `mode: 'number'`; saída pelo `MoneyPresenter`, sempre com `amountInCents` e `formatted`. `multiply` arredonda para o centavo mais próximo **afastando-se do zero**, e `allocate` põe a diferença na primeira parte (RN-0065).

## Consequências

### O que se ganha

- Nenhum ponto flutuante representa dinheiro em nenhum ponto do trajeto.
- Um lugar só define arredondamento e rateio, e os dois são testáveis sem HTTP e sem banco.
- O cliente recebe sempre os dois campos e nunca precisa interpretar texto para calcular.

### O que se aceita perder

- A moeda é implícita: não há Value Object de currency, e multimoeda exigiria mudar o VO **e** a coluna.
- `bigint` com `mode: 'number'` entrega `number` ao código, o que limita o valor ao inteiro seguro do JavaScript — aceito porque nenhum saldo previsto se aproxima disso, mas é um teto real e silencioso.
- `toString()` sai sem símbolo e sem locale, então a formatação de exibição fica inteiramente com o cliente, e dois clientes podem divergir na mesma tela.
