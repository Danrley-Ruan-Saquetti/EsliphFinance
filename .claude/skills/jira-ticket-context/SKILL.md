---
name: jira-ticket-context
description: Ponte entre o branch atual e o ticket Jira que o originou — extrai o número LIPH do nome do branch (`feat/liph-NN-slug`), busca a issue via Atlassian MCP e cruza "Regras de negócio" e "Critérios de aceite" da descrição com `docs/requirements/`. Use ANTES de localizar a RN em `docs/requirements/`, sempre que o branch atual seguir o padrão `liph-NN` ou o pedido citar um número de ticket — para trazer o critério de aceite original à mesa em vez de reconstruir a regra a partir do nome da branch ou do pedido do usuário. Não decide nada sozinha: critério de aceite sem RN correspondente é regra ainda não escrita, e isso é decisão de domínio a ser levantada, nunca implementada em silêncio.
user-invocable: false
---

# Jira Ticket Context — EsliphFinance

Os branches deste repositório nascem de uma issue Jira: `feat/liph-52-transaction-model`, `feat/liph-54-transaction-status`. O número depois de `liph-` é a chave da issue no projeto **LIPH** ("Esliph") do site **esliph.atlassian.net**. Essa issue costuma ter mais contexto do que o nome do branch ou o pedido do usuário — em especial uma lista explícita de RNs e um bloco de critérios de aceite — e hoje nada traz isso para a conversa antes de implementar. É essa lacuna que você fecha.

## Fronteira

**Território** — decide **qual ticket originou o trabalho atual** e **o que a issue diz que ainda não estava na mesa**. Confronta as regras e os critérios de aceite escritos na issue com o que está registrado em `docs/requirements/`, e nomeia cada divergência: bate, diverge, ou não existe.

**Fora da fronteira** — o que fazer com a divergência. Se uma regra existe, o que ela diz, e onde registrar o que falta são decisões de domínio; você as levanta e não as toma. Também fora: implementar qualquer coisa a partir do que a issue diz — a issue é material de origem, não especificação aprovada.

**O que não preciso saber** — o estado do código, a arquitetura, e o que já foi implementado do ticket. Você compara dois textos: o da issue e o do requisito. Trazer o código para essa comparação é a forma mais rápida de concluir que "já está feito" quando a regra sequer foi escrita.

**Contrato de borda** — recebo o branch atual (ou um número de ticket citado). Entrego a chave e o título da issue, o status, as regras citadas com a nota de cada uma, e a lista de critérios de aceite sem regra correspondente. Não recebendo um branch que case com o padrão, entrego a constatação de que não há ticket associado — e nada mais.

**Dependência dura** — o acesso ao Jira por MCP. Sem ele esta skill não tem o que trazer; a saída correta é dizer que a issue não pôde ser lida, nunca reconstruir o conteúdo dela pelo nome do branch.

## Quando não se aplica

- Branch `master`, `develop`, ou qualquer nome que não tenha `liph-<número>` — diga isso e pare. Não adivinhe o ticket por outra via (nome da feature, commit, etc.).
- Tarefa que não veio de branch nenhum (ex.: sessão fora de um repositório git, ou pedido avulso sem relação com uma issue) — não force a busca.

## Passo 1 — Achar a chave da issue

```sh
git branch --show-current
```

Extraia com `liph-(\d+)` (case-insensitive) — o número vira a chave `LIPH-<N>`. Se o branch não casar com o padrão, pare aqui e diga que não há ticket associado.

## Passo 2 — Buscar a issue

Use as tools do MCP Atlassian disponíveis na sessão — **confira os nomes reais antes de chamar**, porque eles variam com o servidor que estiver configurado; um nome memorizado que não existe mais falha de um jeito que parece "sem acesso" e não é. Peça a issue pela chave `LIPH-<N>`, em markdown quando o servidor oferecer o formato.

O `cloudId` deste workspace é fixo, então não precisa ser descoberto a cada vez:

```
cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813   (esliph.atlassian.net)
```

Se a chamada falhar por causa do `cloudId` — site reconfigurado, acesso revogado —, aí sim descubra o `cloudId` atual pela tool de listagem de recursos acessíveis, antes de tentar de novo.

**Se o MCP não estiver disponível ou a issue não puder ser lida, pare e diga isso.** Reconstruir o conteúdo do ticket a partir do nome do branch é exatamente o que esta skill existe para evitar; fazer isso aqui é pior que não ter rodado, porque a reconstrução chega à conversa com a autoridade de um ticket real.

## Passo 3 — Ler a descrição estruturada

A descrição das issues deste projeto segue um padrão (nem toda issue tem as três seções — trate ausência como ausência, não como erro):

- **Objetivo** — a frase-resumo do que a issue entrega.
- **Regras de negócio** — lista com o formato `RN-00xx — <texto>`. É o elo direto com `docs/requirements/`.
- **Critérios de aceite** — comportamento observável esperado, nem sempre 1:1 com uma RN.

`labels` também ajuda: costuma trazer o RF relacionado (`rf-008`) e o contexto (`transacoes`, `contas`).

## Passo 4 — Cruzar com `docs/requirements/`

Para cada RN citada na issue:

- **Existe em `docs/requirements/` com o mesmo número?** Se não, ou se o texto diverge do que a issue descreve, isso é material para uma decisão de domínio — não corrija o requisito você mesma, nem finja que bate. A issue não tem autoridade sobre o requisito: ela é o que alguém escreveu na hora de abrir o card.
- **Todo critério de aceite tem uma RN por trás?** Um critério sem RN correspondente é regra ainda não escrita. Sinalize e pare, igual a qualquer outro comportamento sem regra encontrado no repositório.
- **A issue já está em status `Done`?** Se sim, e o pedido atual é para *mudar* algo, isso não é a implementação original — é uma alteração sobre algo já entregue. Diga isso explicitamente: muda o enquadramento (pode ser bug, pode ser nova RN) e evita tratar como se fosse a primeira vez.

## Como reportar

Resumo curto, entregue antes de a tarefa seguir para a localização da regra:

- Chave e título da issue, e o status atual.
- As RNs citadas, com nota de cada uma: já existe e bate / já existe e diverge / não existe.
- Critérios de aceite sem RN correspondente, se houver.

Não é seu reescrever `docs/requirements/` nem `docs/open-decisions.md`, mesmo quando a divergência veio à tona por aqui. Trazer o material de origem à mesa é o trabalho inteiro; decidir o que ele significa para a especificação é o passo seguinte, e é de outra gente.
