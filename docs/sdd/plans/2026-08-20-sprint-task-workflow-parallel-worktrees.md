# Sprint Task Workflow — Paralelização Multi-Worktree (Fluxo 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Estender `.claude/skills/sprint-task-workflow/SKILL.md` com um Fluxo 4 que roda N tasks de sprint independentes em paralelo — cada uma no seu worktree e stack Docker isolados — disparando um subagente autônomo por task, sem duplicar os Fluxos 1–3 já existentes.

**Architecture:** Edição incremental de um único arquivo de skill já existente, em cinco blocos markdown (decisões, Fluxo 4 completo, casos de borda/fora de escopo/impacto, mais o `description` do frontmatter), seguida de um dry run real limitado (cria e desfaz worktrees/stacks de verdade, mas não dispara subagentes de implementação). Não há código de aplicação nem suíte de testes — cada tarefa entrega uma seção completa do arquivo, verificada por leitura e, quando seguro, por chamada real somente-leitura às ferramentas MCP/CLI envolvidas.

**Tech Stack:** Markdown (skill do Claude Code), `git worktree`, Docker Compose via `make` (`stack-runner`), MCP Atlassian (`mcp__atlassian__*`), a ferramenta `Agent` do Claude Code (subagentes paralelos).

**Spec:** `docs/sdd/specs/2026-08-20-sprint-task-workflow-parallel-worktrees-design.md` — o plano segue essa spec; quem executar deve ler as duas.

## Global Constraints

- Escopo só `server/`. `mobile/` fica fora (spec, "Escopo").
- Entrada do Fluxo 4 é sempre lista explícita de números de ticket — nunca infere do backlog (spec, "Decisões já fechadas").
- Teto de 4 tasks simultâneas por leva — N>4 é recusado com aviso, nunca truncado silenciosamente (spec, "Decisões já fechadas" e "Casos de borda").
- Portas das N tasks são alocadas de uma vez, na sessão orquestradora, **antes** de disparar qualquer subagente — nunca um subagente aloca a própria porta (spec, Fluxo 4 Passo 3).
- Subagentes usam `subagent_type: "general-purpose"`, nunca `fork` — cada task precisa de contexto independente (spec, "Decisões já fechadas").
- Todo `make check`/`make test-e2e` dentro de um subagente roda em **foreground**, nunca aguardando notificação de monitor próprio (spec, "Decisões já fechadas" — lição já registrada em memória de uma sessão que travou fazendo isso).
- Toda transição de Jira resolve o `id` pelo `to.name` do status de destino via `mcp__atlassian__getTransitionsForJiraIssue` — nunca hardcoded (herdado dos Fluxos 1–3, `cloudId` fixo `7039d0db-cf55-4ded-a609-ee57f5164813`, projeto `SCRUM`).
- A skill nunca mergeia PR nem faz encerramento em lote — cada task encerra individualmente pelo Fluxo 3 já existente (spec, "Fora de escopo").

---

### Task 1: Frontmatter e novas decisões

**Files:**
- Modify: `.claude/skills/sprint-task-workflow/SKILL.md` (frontmatter `description` e tabela `## Decisões já fechadas`)

**Interfaces:**
- Consumes: o frontmatter e a tabela de decisões já existentes (Fluxos 1–3).
- Produces: os gatilhos do Fluxo 4 no `description` e as sete linhas de decisão que as Tasks 2–4 referenciam como já fechadas.

- [ ] **Step 1: Atualizar o `description` do frontmatter**

Troque a frase de gatilhos do frontmatter (linha 3 do arquivo atual) — que hoje cobre só início e encerramento — para incluir o Fluxo 4:

```yaml
description: O orquestrador do ciclo de uma task de sprint do EsliphFinance — cria o worktree isolado, sobe um stack Docker próprio, move a issue no Jira e abre o PR ao final, amarrando o que a `jira-ticket-context`, a `tech-lead`, a `stack-runner` e o agent `code-reviewer` já fazem, sem duplicar nenhuma delas. Use SEMPRE para começar uma task nova da sprint — "começa a SCRUM-60", "cria o worktree pra próxima task", "bora implementar a scrum-53" —, para encerrar uma já mergeada — "encerra a scrum-52", "o PR da scrum-54 já foi mergeado, fecha isso" — e para rodar várias tasks independentes ao mesmo tempo, cada uma isolada no próprio worktree e stack — "paraleliza SCRUM-60, SCRUM-64 e SCRUM-70", "roda essas 3 tasks em paralelo". Cobre só `server/`; `mobile/` está fora porque será reescrito do zero. Não decide regra de negócio (`business-analyst`) nem implementa código (`tech-lead` e as skills que ela aciona) — só decide quando cada uma entra, e nunca mergeia um PR sozinha.
```

- [ ] **Step 2: Acrescentar as sete linhas de decisão do Fluxo 4**

Na tabela `## Decisões já fechadas`, depois da última linha existente ("Subida do stack | Automática..."), acrescente:

```markdown
| Orquestração da paralelização | Subagentes autônomos (`Agent` tool), um por task — cada um roda o ciclo completo (jira-ticket-context → tech-lead → code-reviewer → PR) dentro do próprio worktree |
| Entrada da paralelização | Só lista explícita de números de ticket — nunca infere do backlog |
| Teto de paralelismo | 4 tasks simultâneas — mesmo intervalo de porta (5441–5444) já usado como referência; N>4 é recusado com aviso |
| Checagem de domínio sobreposto | Avisa se duas tasks da leva caírem no mesmo contexto de `docs/domains/` e confirma pontualmente antes de seguir com aquele par — não bloqueia as demais |
| Report da paralelização | Por task, assim que o subagente correspondente termina — a sessão orquestradora não espera as N |
| Tipo de subagente | `Agent` com `subagent_type: "general-purpose"` — nunca `fork`, porque cada task precisa de contexto próprio, não do histórico da conversa que disparou a leva |
| `make check`/e2e dentro do subagente | Sempre em foreground, nunca aguardando notificação de monitor próprio |
```

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/sprint-task-workflow/SKILL.md
git commit -m "feat: Adicionando gatilhos e decisões do Fluxo 4 (paralelização) à sprint-task-workflow"
```

---

### Task 2: Fluxo 4, Passos 1–2 — Resolver a leva e ler as issues

**Files:**
- Modify: `.claude/skills/sprint-task-workflow/SKILL.md` (acrescenta `## Fluxo 4 — Paralelização multi-worktree` com os Passos 1–2, ao final do arquivo, depois do `## Fluxo 3`)

**Interfaces:**
- Consumes: nenhuma (primeiro bloco do Fluxo 4).
- Produces: a lista final de tickets válidos da leva (já sem os que estavam em progresso) e o resumo de RNs/critérios de aceite por ticket, que a Task 3 consome para criar os worktrees.

- [ ] **Step 1: Acrescentar o cabeçalho do Fluxo 4 e os Passos 1–2**

```markdown
## Fluxo 4 — Paralelização multi-worktree

Gatilho: lista explícita de tickets — "paraleliza SCRUM-60, SCRUM-64 e SCRUM-70", "roda essas N tasks em paralelo", "começa essas 3 ao mesmo tempo".

### Passo 1 — Resolver e validar a leva

Faça o parse dos N números citados. Se N > 4, **recusa com aviso** — não segue com uma subleva silenciosa dos 4 primeiros.

Para cada ticket restante:

\`\`\`
mcp__atlassian__getJiraIssue
  cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813
  issueIdOrKey: "SCRUM-<N>"
  responseContentFormat: "markdown"
\`\`\`

O `status.name` precisa ser `"To Do"`. Um ticket que já estiver `"In Progress"` ou `"In Review"` sai da leva com aviso — mesma regra do Fluxo 1, Passo 2, de não criar um segundo worktree para uma task já em andamento — mas **não aborta a leva inteira**: as demais seguem.

### Passo 2 — Ler as N issues e checar domínio sobreposto

Antes de criar qualquer worktree, invoque a skill `jira-ticket-context` (via `Skill`) para cada ticket restante da leva, sequencialmente — são só chamadas MCP de leitura. Cada resultado dá o slug do branch (do `summary`) e o cruzamento de RNs/critérios de aceite com `docs/requirements.md`, exatamente como o Fluxo 1, Passo 2 faz para uma task.

Use esse mesmo resultado para inferir o contexto de domínio de cada task (comparando o `summary`/descrição contra os nomes de contexto em `docs/domains/` — hoje `user`, `account-group`, `account`, `category`, `transaction`). Se duas ou mais tasks da leva caírem no mesmo contexto, avise a colisão e peça confirmação pontual antes de seguir com aquele par especificamente — as tasks sem colisão não esperam por essa confirmação.
```

- [ ] **Step 2: Verificar a checagem de status contra o board real**

Rode a consulta somente-leitura de fato, para confirmar que a sintaxe está certa e observar tickets reais em `"To Do"`:

```
mcp__atlassian__searchJiraIssuesUsingJql
  cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813
  jql: project = SCRUM AND status = "To Do" ORDER BY updated DESC
  maxResults: 5
  fields: ["summary", "status"]
```

Expected: retorna issues com `status.name == "To Do"`, sem erro de sintaxe JQL — confirma que o Passo 1 consegue distinguir `"To Do"` de outros status usando o mesmo campo.

Confirme que `docs/domains/` tem um arquivo por contexto citado no Passo 2:

```sh
ls docs/domains/
```

Expected: lista `user.md`, `account-group.md`, `account.md`, `category.md`, `transaction.md` (ou o conjunto atual) — se os nomes tiverem mudado, ajuste o Passo 2 para os nomes reais antes de commitar.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/sprint-task-workflow/SKILL.md
git commit -m "feat: Adicionando Fluxo 4 Passos 1-2 (resolver leva e ler issues) à sprint-task-workflow"
```

---

### Task 3: Fluxo 4, Passos 3–4 — Alocar portas e mover Jira

**Files:**
- Modify: `.claude/skills/sprint-task-workflow/SKILL.md` (acrescenta os Passos 3–4 ao `## Fluxo 4`)

**Interfaces:**
- Consumes: a lista final de tickets e os slugs produzidos na Task 2.
- Produces: os N worktrees criados com porta/`STACK_SUFFIX` únicos e as N issues em `In Progress`, que a Task 4 consome para subir os stacks e disparar os subagentes.

- [ ] **Step 1: Acrescentar os Passos 3–4**

```markdown
### Passo 3 — Alocar as N portas de uma vez

Calcule, na própria sessão orquestradora, as N menores portas livres a partir de 5441 entre os worktrees **vivos** (mesma consulta do Fluxo 1, Passo 4):

\`\`\`sh
git worktree list --porcelain | awk '/^worktree/{print $2}' | grep '\.claude/worktrees/' | while read -r wt; do
  [ -f "$wt/server/.env" ] && grep -oP 'POSTGRES_PORT="\K[0-9]+' "$wt/server/.env"
done | sort -n
\`\`\`

Pegue os N menores inteiros a partir de `5441` que não aparecerem nessa lista — **tudo antes de disparar qualquer subagente**, para não ter dois subagentes lendo o mesmo estado em paralelo e reservando a mesma porta.

Para cada task, crie o worktree (mesmo padrão do Fluxo 1, Passo 3):

\`\`\`sh
git fetch origin develop
git worktree add .claude/worktrees/scrum-<N>-<slug> -b feat/scrum-<N>-<slug> develop
\`\`\`

E escreva o `server/.env` de cada um (copiando de `server/.env.example` como base):

\`\`\`
STACK_SUFFIX="-scrum-<N>"
POSTGRES_PORT="<porta alocada>"
\`\`\`

### Passo 4 — Jira: To Do → In Progress

Para cada task restante da leva, sequencial, mesma resolução de `id` pelo `to.name` do Fluxo 1, Passo 6:

\`\`\`
mcp__atlassian__getTransitionsForJiraIssue
  cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813
  issueIdOrKey: "SCRUM-<N>"
# procure na lista "transitions" o item cujo "to.name" seja "In Progress" e use o "id" dele

mcp__atlassian__transitionJiraIssue
  cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813
  issueIdOrKey: "SCRUM-<N>"
  transition: { id: "<id resolvido>" }
\`\`\`
```

- [ ] **Step 2: Verificar o algoritmo de porta contra o estado real do repositório**

```sh
git worktree list --porcelain | awk '/^worktree/{print $2}' | grep '\.claude/worktrees/' | while read -r wt; do
  [ -f "$wt/server/.env" ] && grep -oP 'POSTGRES_PORT="\K[0-9]+' "$wt/server/.env"
done | sort -n
```

Expected: lista só as portas dos worktrees que aparecem em `git worktree list` — a mesma verificação já feita para o Fluxo 1, Passo 4 no plano-base continua válida aqui, porque o Passo 3 reaproveita exatamente essa consulta, só que para reservar N portas em vez de uma.

Releia o Passo 4 e confirme que ele resolve o `id` de "In Progress" pela mesma lógica do Fluxo 1, Passo 6 (nunca hardcoded) — checagem de consistência entre fluxos, não uma chamada real (a transição real muta a issue).

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/sprint-task-workflow/SKILL.md
git commit -m "feat: Adicionando Fluxo 4 Passos 3-4 (alocar portas e mover Jira) à sprint-task-workflow"
```

---

### Task 4: Fluxo 4, Passos 5–7 — Subir stacks, disparar subagentes e reportar

**Files:**
- Modify: `.claude/skills/sprint-task-workflow/SKILL.md` (acrescenta os Passos 5–7 ao `## Fluxo 4`)

**Interfaces:**
- Consumes: os N worktrees, portas e o resumo de RNs/critérios de aceite por task (Tasks 2–3).
- Produces: nenhuma consumida por outra task deste plano — fecha o corpo do Fluxo 4; a Task 5 só acrescenta as seções de apoio.

- [ ] **Step 1: Acrescentar os Passos 5–7**

```markdown
### Passo 5 — Subir os N stacks

Via `stack-runner`, um `make -C <worktree>/server deps && up && db-migrate` por worktree, disparado **em paralelo** (uma chamada de shell por worktree na mesma mensagem) — cada stack usa porta, `STACK_SUFFIX` e volume próprios, então não há disputa de recurso entre eles:

\`\`\`sh
make -C .claude/worktrees/scrum-<N1>-<slug1>/server deps
make -C .claude/worktrees/scrum-<N1>-<slug1>/server up
make -C .claude/worktrees/scrum-<N1>-<slug1>/server db-migrate
\`\`\`

(repita para cada worktree da leva, em chamadas paralelas)

### Passo 6 — Disparar os N subagentes em uma única mensagem paralela

Uma chamada `Agent` por task, todas na mesma mensagem — paralelas de fato, não sequenciais. `subagent_type: "general-purpose"`, nunca `fork`. Cada prompt é autocontido e inclui:

- Caminho do worktree e nome do branch já criados no Passo 3.
- Porta alocada.
- O resumo de RNs/critérios de aceite que a `jira-ticket-context` já trouxe no Passo 2 — o subagente **não** reinvoca `jira-ticket-context`, parte direto do roteiro da `tech-lead` a partir de onde ela normalmente entra.
- Instrução explícita de rodar `make check`/`make test-e2e` em **foreground** dentro do próprio subagente, nunca aguardando notificação de um monitor próprio.
- Instrução de, ao fechar limpo (checklist "O fechamento" da `tech-lead`), executar o Fluxo 2 já existente por conta própria: push, `gh pr create`, transição Jira In Progress → In Review, comentário com o link do PR.
- Instrução de, se travar em algo que precise de decisão humana (critério sem RN correspondente, ambiguidade de regra), escalar como a `tech-lead`/`business-analyst` já fariam numa sessão solo, e reportar o bloqueio como resultado — não travar silenciosamente.

### Passo 7 — Reportar conforme cada subagente termina

A sessão orquestradora não aguarda as N tasks para reportar; cada notificação de subagente concluído (sucesso com link do PR, ou bloqueio) é repassada ao usuário assim que chega.
```

- [ ] **Step 2: Verificar a consistência dos alvos `make` e da instrução de foreground**

```sh
grep -A1 "^check:" server/Makefile
```

Expected: `check: typecheck lint test test-e2e` — confirma que o alvo que o subagente deve rodar em foreground existe e é o mesmo citado no roteiro da `tech-lead`.

Releia o Passo 6 e confirme que nenhuma instrução pede ao subagente para usar `ScheduleWakeup`/`Monitor` esperando o próprio `make check` rodar em background — é exatamente o padrão que travou uma sessão anterior (registrado em memória) e que este passo precisa proibir explicitamente, não só sugerir.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/sprint-task-workflow/SKILL.md
git commit -m "feat: Adicionando Fluxo 4 Passos 5-7 (stacks, subagentes e report) à sprint-task-workflow"
```

---

### Task 5: Casos de borda, fora de escopo e impacto no restante da skill

**Files:**
- Modify: `.claude/skills/sprint-task-workflow/SKILL.md` (acrescenta casos de borda do Fluxo 4 à seção `## Casos de borda` existente, atualiza o item já existente sobre paralelismo, e acrescenta itens à `## Fora de escopo`)

**Interfaces:**
- Consumes: os Fluxos 1–4 completos (Tasks 1–4).
- Produces: o arquivo completo da skill, pronto para o dry run da Task 6.

- [ ] **Step 1: Atualizar o item existente de "Casos de borda" sobre paralelismo**

Troque a linha atual:

```markdown
- **Duas tasks "ao mesmo tempo"**: a skill não impede, mas repete o aviso já registrado em memória — tasks sequenciais ou da mesma entidade devem ser empilhadas, uma de cada vez, não paralelizadas: stacks simultâneos com e2e truncando tabelas (`RESTART IDENTITY CASCADE`) derrubam os dados um do outro.
```

Por:

```markdown
- **Duas ou mais tasks ao mesmo tempo**: o caminho suportado é o **Fluxo 4** — cada worktree com `STACK_SUFFIX`/`POSTGRES_PORT` próprios não compartilha banco, então não há colisão de dados entre stacks corretamente isolados. Fora do Fluxo 4 (worktrees criados manualmente, sem `.env` próprio), o aviso original continua valendo: tasks sequenciais ou da mesma entidade devem ser empilhadas, uma de cada vez — um worktree sem `STACK_SUFFIX` cai de volta no banco da raiz, e como cada spec e2e trunca as tabelas com `RESTART IDENTITY CASCADE`, duas suítes simultâneas nesse cenário derrubam os dados uma da outra.
```

- [ ] **Step 2: Acrescentar os casos de borda específicos do Fluxo 4**

Depois do item anterior (já atualizado), acrescente:

```markdown
- **N > 4 no Fluxo 4**: recusa, não trunca silenciosamente a leva para os 4 primeiros.
- **Ticket já em progresso dentro da leva do Fluxo 4**: sai da leva com aviso, as demais seguem.
- **Domínio sobreposto entre duas tasks da leva do Fluxo 4**: avisa e confirma pontualmente, não aborta as tasks sem colisão.
- **Um subagente do Fluxo 4 trava ou bloqueia**: os demais seguem independentes; o bloqueio é reportado como resultado daquela task, não propagado às outras.
```

- [ ] **Step 3: Acrescentar itens à "Fora de escopo"**

Depois do último item já existente ("Criação ou edição de issues no Jira..."), acrescente:

```markdown
- Encerramento em lote de várias tasks de uma vez — cada uma encerra individualmente pelo Fluxo 3, mesmo quando criada via Fluxo 4.
- Qualquer paralelismo dentro de uma única task — isso continua sendo assunto da `tech-lead`.
```

- [ ] **Step 4: Acrescentar os itens do Fluxo 4 ao checklist final**

Depois do último item já existente ("`make down` roda antes de `git worktree remove`..."), acrescente:

```markdown
- [ ] Toda leva do Fluxo 4 tem N ≤ 4 — pedido maior é recusado, nunca truncado
- [ ] As N portas da leva são alocadas de uma vez, antes de disparar qualquer subagente
- [ ] Todo subagente do Fluxo 4 usa `subagent_type: "general-purpose"`, nunca `fork`
- [ ] Nenhum subagente do Fluxo 4 espera notificação de monitor próprio para `make check`/e2e — sempre foreground
```

- [ ] **Step 5: Ler o arquivo inteiro e conferir contra a spec**

```sh
wc -l .claude/skills/sprint-task-workflow/SKILL.md
```

Releia `.claude/skills/sprint-task-workflow/SKILL.md` de ponta a ponta e confira cada seção da spec (`docs/sdd/specs/2026-08-20-sprint-task-workflow-parallel-worktrees-design.md`) contra uma seção correspondente no arquivo — nenhuma linha da tabela "Decisões já fechadas" do Fluxo 4 deve ficar sem uma seção que a aplique.

- [ ] **Step 6: Commit**

```bash
git add .claude/skills/sprint-task-workflow/SKILL.md
git commit -m "feat: Adicionando casos de borda, fora de escopo e checklist do Fluxo 4 à sprint-task-workflow"
```

---

### Task 6: Dry run real do Fluxo 4 — só com confirmação explícita do usuário

**Files:**
- Nenhum arquivo modificado nesta task — validação de comportamento, não mudança de conteúdo.

**Interfaces:**
- Consumes: o arquivo completo da `sprint-task-workflow` (Tasks 1–5).
- Produces: nenhuma — última tarefa do plano.

- [ ] **Step 1: Pedir ao usuário duas issues `To Do` de baixo risco**

Este passo tem efeito colateral real (cria dois worktrees de verdade, sobe dois stacks Docker, move duas issues no Jira). **Pare aqui e pergunte ao usuário quais duas issues `To Do` de baixo risco do backlog usar** — não escolha sozinho, e não use mais que duas: o dry run valida o mecanismo, não precisa do teto de 4 para isso.

- [ ] **Step 2: Executar os Passos 1–4 do Fluxo 4 de ponta a ponta, para as duas issues escolhidas**

```sh
# Passo 3 do Fluxo 4 — porta, para as duas
git worktree list --porcelain | awk '/^worktree/{print $2}' | grep '\.claude/worktrees/' | while read -r wt; do
  [ -f "$wt/server/.env" ] && grep -oP 'POSTGRES_PORT="\K[0-9]+' "$wt/server/.env"
done | sort -n

git fetch origin develop
git worktree add .claude/worktrees/scrum-<N1>-<slug1> -b feat/scrum-<N1>-<slug1> develop
git worktree add .claude/worktrees/scrum-<N2>-<slug2> -b feat/scrum-<N2>-<slug2> develop
```

Escreva o `server/.env` de cada worktree com `STACK_SUFFIX`/`POSTGRES_PORT` únicos (Passo 3), aplique as transições `To Do → In Progress` das duas issues (Passo 4).

- [ ] **Step 3: Subir os dois stacks em paralelo (Passo 5) e confirmar o isolamento**

```sh
make -C .claude/worktrees/scrum-<N1>-<slug1>/server deps
make -C .claude/worktrees/scrum-<N1>-<slug1>/server up
make -C .claude/worktrees/scrum-<N1>-<slug1>/server db-migrate
make -C .claude/worktrees/scrum-<N2>-<slug2>/server deps
make -C .claude/worktrees/scrum-<N2>-<slug2>/server up
make -C .claude/worktrees/scrum-<N2>-<slug2>/server db-migrate
```

Expected: os dois stacks sobem saudáveis (`make -C <worktree>/server ps`), em portas diferentes, e as duas issues aparecem `In Progress` no Jira.

**Não execute o Passo 6** (disparo dos subagentes) — isso dispararia uma implementação real de duas tasks, fora do escopo de validar o mecanismo de infraestrutura do Fluxo 4. O dry run termina aqui.

- [ ] **Step 4: Desfazer o dry run**

Para cada um dos dois worktrees, mesmo procedimento do Fluxo 3 (sem PR de verdade — confirme direto com o usuário que é seguro descartar em vez de checar `gh pr view`):

```sh
make -C .claude/worktrees/scrum-<N1>-<slug1>/server down
git worktree remove .claude/worktrees/scrum-<N1>-<slug1>
git branch -D feat/scrum-<N1>-<slug1>

make -C .claude/worktrees/scrum-<N2>-<slug2>/server down
git worktree remove .claude/worktrees/scrum-<N2>-<slug2>
git branch -D feat/scrum-<N2>-<slug2>
```

E devolva as duas issues de teste ao estado original (`To Do`) via `mcp__atlassian__transitionJiraIssue`, para não deixar o board sujo por causa do dry run.

- [ ] **Step 5: Reportar o resultado do dry run ao usuário**

Confirme explicitamente que as duas portas alocadas não colidiram, que os dois stacks subiram isolados, e que a leva foi corretamente desfeita. Sem commit neste passo — é validação, não mudança de arquivo.
