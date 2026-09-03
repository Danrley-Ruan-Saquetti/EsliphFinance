---
id: ADR-0007
title: A resposta de erro não distingue o caso quando distinguir informa quem sonda
status: accepted
owner: "@DANRLEY-RUAN-SAQUETTI"
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-09-03
relates-to: [RN-0010, RN-0011, ADR-0004, ADR-0006]
supersedes: null
superseded-by: null
---

# ADR-0007 — A resposta de erro não distingue o caso quando distinguir informa quem sonda

## Contexto

Duas situações na borda HTTP permitem responder com mais precisão do que o cliente legítimo precisa. A primeira é a falha de autenticação: header ausente, esquema errado, assinatura inválida, token vencido, `sub` que não é UUID. A segunda é o acesso a um registro que existe mas pertence a outro usuário (RN-0010, RN-0011). Nos dois casos a resposta precisa é gratuita para quem já sabe o que está fazendo e informativa para quem está sondando.

## Alternativas consideradas

1. **403 para registro alheio, 404 para registro inexistente.** É a leitura literal dos códigos HTTP. Descartada porque o 403 confirma que aquele identificador existe e pertence a alguém: a diferença é enumerável, e o cliente legítimo não ganha nada com ela.
2. **Mensagens ou códigos distintos por causa da falha de autenticação** — token vencido separado de assinatura inválida. Descartada porque informa a quem sonda qual condição falhou, e o cliente legítimo pode tratar as duas do mesmo jeito: tentar renovar e, falhando, reautenticar.
3. **Distinguir apenas em ambiente de desenvolvimento.** Descartada porque cria dois contratos de erro para a mesma rota, e o comportamento de produção passa a ser o menos exercitado.

## Decisão

Toda falha de autenticação devolve o **mesmo** `UnauthenticatedError` (401), sem distinção de causa. O acesso a registro de outro usuário devolve `ResourceNotFoundError` (404), com a mesma mensagem do registro que não existe — **nunca 403**. O `NotAllowedError` (403) fica reservado à operação que o dono não pode executar sobre o que é dele.

## Consequências

### O que se ganha

- Não há oráculo de enumeração: nem de identificadores de registro, nem de qual condição de autenticação falhou.
- O caso de uso reúne "não existe" e "não é seu" numa guard clause só, o que elimina a chance de as duas divergirem.
- O significado de 403 fica sem ambiguidade: se veio 403, é operação, não propriedade.

### O que se aceita perder

- O cliente legítimo não distingue "não existe" de "não é seu", e o suporte também não: o diagnóstico depende do log do servidor.
- O aplicativo não consegue decidir entre renovar e reautenticar apenas pelo 401 — precisa tentar a renovação e observar o resultado.
- Um bug que produza `sub` inválido é indistinguível, pela resposta, de um token forjado; o que separa os dois é log, que hoje não existe para 4xx (ADR-0004, TDR-0003).
