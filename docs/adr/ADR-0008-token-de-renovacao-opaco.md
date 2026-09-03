---
id: ADR-0008
title: O token de renovação é um segredo opaco, guardado como SHA-256, e não um JWT
status: accepted
owner: "@DANRLEY-RUAN-SAQUETTI"
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-09-03
relates-to: [RNF-0005, RNF-0006, RN-0006, RN-0007, RN-0008, RN-0009, RN-0013]
supersedes: null
superseded-by: null
---

# ADR-0008 — O token de renovação é um segredo opaco, guardado como SHA-256, e não um JWT

## Contexto

RNF-0005 estabelece autenticação por JWT, e o par de tokens da RN-0004 leva à leitura natural de que os dois tokens são JWT. Mas as regras do token de renovação exigem **invalidação**: ele é invalidado a cada uso (RN-0007), no encerramento da sessão (RN-0008), na troca de senha (RN-0009) e na exclusão do usuário (RN-0013). Invalidação é exatamente o que um token autocontido não oferece.

## Alternativas consideradas

1. **JWT autocontido também para a renovação, com lista de revogados.** Descartada porque a lista de revogados é o mesmo estado em banco que a alternativa adotada mantém, só que consultado a cada renovação **e** ainda carregando o custo de assinar e verificar — sem nenhuma das vantagens do token autocontido, já que a consulta deixa de ser opcional.
2. **Token opaco guardado em claro.** Descartada porque o vazamento da tabela passaria a permitir renovar sessão alheia diretamente, o que contraria o espírito da RNF-0006 — que exige hash irreversível para senha exatamente pela mesma razão.
3. **Token de renovação com o mesmo prazo curto do de acesso, dispensando a rotação.** Descartada porque anula a RN-0006: a renovação existe para não pedir credencial de novo.

## Decisão

O token de renovação é um segredo opaco de 32 bytes aleatórios em `base64url`, gerado pela porta `RefreshTokenGenerator`; o banco guarda **apenas o SHA-256** dele. O token de acesso continua JWT assinado em HS256 com `JWT_SECRET` (RNF-0005).

## Consequências

### O que se ganha

- Rotação (RN-0007) e encerramento de sessão (RN-0008) são exclusão de linha, não uma lista paralela de revogados.
- Vazamento da tabela não permite renovar sessão: o valor guardado não é o token.
- A invalidação em massa exigida por RN-0009 e RN-0013 é uma consulta por usuário.

### O que se aceita perder

- Toda renovação vai ao banco: não existe validação offline do token de renovação, e o banco fora derruba a renovação mesmo com o token válido.
- O SHA-256 sem sal só é adequado porque a entrada tem alta entropia. Isso amarra a decisão ao gerador: trocar `RefreshTokenGenerator` por algo previsível quebra a premissa **em silêncio**, sem que nenhum teste do hash acuse.
- O par de tokens deixa de ser homogêneo, então o cliente e o servidor tratam cada um por um caminho diferente.
