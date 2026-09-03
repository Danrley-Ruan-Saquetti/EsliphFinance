---
id: TDR-0003
title: A API não deixa registro de acesso, e o requestId entregue ao cliente não encontra nada
status: open
owner: "@DANRLEY-RUAN-SAQUETTI"
trigger: >
  Quando o gatilho de pagamento abaixo se cumprir.
last-reviewed: 2026-09-03
relates-to: [ADR-0004, ADR-0007]
pay-when:
  pattern: '\bdeploy\b'
  paths: [".github/workflows/**"]
---

# TDR-0003 — A API não deixa registro de acesso, e o `requestId` entregue ao cliente não encontra nada

## O atalho

O único log que existe é o do `AllExceptionsFilter`, e só para status ≥ 500. Requisição bem-sucedida, erro 4xx e latência não deixam registro nenhum. O `RequestIdMiddleware` gera ou aceita um `x-request-id`, devolve-o no header e o filtro o repete no corpo do erro — mas **não há nada do lado do servidor a que esse identificador leve**. Não existe interceptor de log, e a lacuna é conhecida desde que a cadeia de middlewares foi escrita.

## Por que foi aceito

Sem ambiente de produção, log de acesso é ruído no terminal de quem desenvolve, e escolher formato, destino e nível de detalhe antes de existir onde consumi-lo fixaria a decisão no vazio. O `x-request-id` foi construído primeiro justamente para que a correlação seja possível quando o log existir.

## Gatilho de pagamento

O primeiro workflow de deploy no repositório. É quando passa a existir um ambiente cujo comportamento ninguém observa diretamente — até lá, quem roda a aplicação está olhando para ela.

## Custo de continuar devendo

Duas decisões dependem desse log para serem diagnosticáveis e hoje não são. ADR-0004 escolhe não logar 4xx, o que só é aceitável se houver como reconstruir a requisição pelo `requestId`. ADR-0007 escolhe não distinguir a causa da falha de autenticação nem separar "não existe" de "não é seu", e diz explicitamente que o diagnóstico depende do log do servidor. Enquanto essa dívida estiver aberta, as duas decisões custam mais do que declaram: o suporte não tem para onde olhar, e um bug que produza 401 ou 404 indevido é indistinguível de uso legítimo.
