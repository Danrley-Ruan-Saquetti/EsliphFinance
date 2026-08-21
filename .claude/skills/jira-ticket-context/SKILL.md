---
name: jira-ticket-context
description: Ponte entre o branch atual e o ticket Jira que o originou — extrai o número LIPH do nome do branch (`feat/liph-NN-slug`), busca a issue via Atlassian MCP e cruza "Regras de negócio" e "Critérios de aceite" da descrição com `docs/requirements.md`. Use ANTES de localizar a RN em `docs/requirements.md`, sempre que o branch atual seguir o padrão `liph-NN` ou o pedido citar um número de ticket — para trazer o critério de aceite original em vez de a `business-analyst` reconstruir a regra só a partir do nome da branch ou do pedido do usuário. Não decide nada sozinha: se achar critério de aceite sem RN correspondente, o encaminhamento é sempre a `business-analyst`, nunca implementar em silêncio.
user-invocable: false
---

# Jira Ticket Context — EsliphFinance

Os branches deste repositório nascem de uma issue Jira: `feat/liph-52-transaction-model`, `feat/liph-54-transaction-status`. O número depois de `liph-` é a chave da issue no projeto **LIPH** ("Esliph") do site **esliph.atlassian.net**. Essa issue costuma ter mais contexto do que o nome do branch ou o pedido do usuário — em especial uma lista explícita de RNs e um bloco de critérios de aceite — e hoje nada traz isso para a conversa antes de implementar. É essa lacuna que você fecha.

Você não substitui a `business-analyst`: ela continua sendo quem decide se uma RN existe, o que ela diz e onde registrar o que falta. Você só traz o material de origem para a mesa antes dela precisar reconstruir a partir de menos informação.

## Quando não se aplica

- Branch `master`, `develop`, ou qualquer nome que não tenha `liph-<número>` — diga isso e pare. Não adivinhe o ticket por outra via (nome da feature, commit, etc.).
- Tarefa que não veio de branch nenhum (ex.: sessão fora de um repositório git, ou pedido avulso sem relação com uma issue) — não force a busca.

## Passo 1 — Achar a chave da issue

```sh
git branch --show-current
```

Extraia com `liph-(\d+)` (case-insensitive) — o número vira a chave `LIPH-<N>`. Se o branch não casar com o padrão, pare aqui e diga que não há ticket associado.

## Passo 2 — Buscar a issue

Use as tools do MCP Atlassian (`mcp__atlassian__*`). O `cloudId` deste workspace é fixo — não precisa descobrir de novo a cada vez:

```
cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813   (esliph.atlassian.net)
```

```
mcp__atlassian__getJiraIssue
  cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813
  issueIdOrKey: "LIPH-<N>"
  responseContentFormat: "markdown"
```

Se a chamada falhar por causa do `cloudId` (site reconfigurado, acesso revogado), aí sim chame `mcp__atlassian__getAccessibleAtlassianResources` para obter o `cloudId` atual antes de tentar de novo.

## Passo 3 — Ler a descrição estruturada

A descrição das issues deste projeto segue um padrão (nem toda issue tem as três seções — trate ausência como ausência, não como erro):

- **Objetivo** — a frase-resumo do que a issue entrega.
- **Regras de negócio** — lista com o formato `RNxxx — <texto>`. É o elo direto com `docs/requirements.md`.
- **Critérios de aceite** — comportamento observável esperado, nem sempre 1:1 com uma RN.

`labels` também ajuda: costuma trazer o RF relacionado (`rf-008`) e o contexto (`transacoes`, `contas`).

## Passo 4 — Cruzar com `docs/requirements.md`

Para cada RN citada na issue:

- **Existe em `docs/requirements.md` com o mesmo número?** Se não, ou se o texto diverge do que a issue descreve, isso é material para a `business-analyst` decidir — não corrija o requisito você mesma, nem finja que bate.
- **Todo critério de aceite tem uma RN por trás?** Um critério sem RN correspondente é regra ainda não escrita. Sinalize e pare — a saída é `business-analyst`, igual a qualquer outro comportamento sem RN encontrado no repositório.
- **A issue já está em status `Done`?** Se sim, e o pedido atual é para *mudar* algo, isso não é a implementação original — é uma alteração sobre algo já entregue. Diga isso explicitamente: muda o enquadramento (pode ser bug, pode ser nova RN) e evita tratar como se fosse a primeira vez.

## Como reportar

Resumo curto antes de seguir para a `business-analyst` ou para a localização da RN:

- Chave e título da issue, e o status atual.
- As RNs citadas, com nota de cada uma: já existe e bate / já existe e diverge / não existe.
- Critérios de aceite sem RN correspondente, se houver.

Não é seu reescrever `docs/requirements.md` nem `docs/open-decisions.md` — isso é sempre da `business-analyst`, mesmo quando a divergência veio à tona por aqui.
