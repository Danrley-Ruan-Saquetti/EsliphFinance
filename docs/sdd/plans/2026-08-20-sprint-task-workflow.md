# Sprint Task Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a skill `.claude/skills/sprint-task-workflow/SKILL.md`, que orquestra o ciclo completo de uma task de sprint do EsliphFinance — worktree isolado, stack Docker próprio, transições de status no Jira e abertura de PR — amarrando as skills e o agent já existentes (`jira-ticket-context`, `tech-lead`, `stack-runner`, agent `code-reviewer`) sem duplicar nenhuma delas.

**Architecture:** Um único arquivo de skill, estruturado em três fluxos independentes (início, fim/PR automático, encerramento) mais as seções de contexto (objetivo, escopo, decisões) e apoio (casos de borda, fora de escopo, checklist). Não há código de aplicação nem suíte de testes — cada tarefa entrega uma seção completa do arquivo, verificada por leitura e, quando seguro, por uma chamada real e somente-leitura às ferramentas MCP/CLI envolvidas.

**Tech Stack:** Markdown (skill do Claude Code), `git worktree`, Docker Compose via `make` (`stack-runner`), MCP Atlassian (`mcp__atlassian__*`), GitHub CLI (`gh`).

**Spec:** `docs/sdd/specs/2026-08-20-sprint-task-workflow-design.md` — o plano segue essa spec; quem executar deve ler as duas.

## Global Constraints

- Escopo só `server/`. `mobile/` fica fora — será reescrito do zero (spec, seção "Escopo").
- Branch e worktree seguem nomenclatura fixa: `feat/scrum-NN-<slug>` (ou `fix/`) em `.claude/worktrees/scrum-NN-<slug>`; sem ticket vira `chore/<slug>` em `.claude/worktrees/<slug>` (spec, "Decisões" e Fluxo 1 passo 3).
- Porta Postgres: reaproveita a menor porta livre a partir de 5441 entre os **worktrees vivos segundo `git worktree list`** — não uma varredura cega de diretórios em `.claude/worktrees/`, porque diretórios órfãos (worktree já removido, pasta esquecida) existem hoje no repositório e não devem contar como "vivos".
- Todas as transições de Jira resolvem o `id` da transição pelo **nome** via `mcp__atlassian__getTransitionsForJiraIssue` antes de chamar `mcp__atlassian__transitionJiraIssue` — nunca hardcoded, porque o id pode variar por tipo de issue.
- `cloudId` do Atlassian MCP é fixo: `7039d0db-cf55-4ded-a609-ee57f5164813` (site `esliph.atlassian.net`, projeto `SCRUM`).
- A skill nunca mergeia PR nem observa merge em background — o encerramento é sempre um comando explícito do usuário, que confirma o merge via `gh pr view` antes de qualquer mutação (spec, "Fora de escopo").
- Toda subida/derrubada de stack passa pela `stack-runner` (`make -C <worktree>/server <alvo>`) — nunca `docker compose` ou `npm` direto.
- Estilo do arquivo: português, mesmo formato das 9 skills já existentes em `.claude/skills/` (frontmatter `name`+`description` com gatilhos de uso explícitos, corpo em seções `##`/`###`, sem comentário de código já que o entregável é markdown).

---

### Task 1: Frontmatter, objetivo, escopo e decisões

**Files:**
- Create: `.claude/skills/sprint-task-workflow/SKILL.md`

**Interfaces:**
- Produces: o arquivo da skill, com frontmatter `name: sprint-task-workflow` e as seções `# Sprint Task Workflow — EsliphFinance`, `## Objetivo`, `## Escopo`, `## Decisões já fechadas` — seções que as Tasks 2–5 completam por baixo.

- [ ] **Step 1: Criar o arquivo com frontmatter + objetivo + escopo + decisões**

```markdown
---
name: sprint-task-workflow
description: O orquestrador do ciclo de uma task de sprint do EsliphFinance — cria o worktree isolado, sobe um stack Docker próprio, move a issue no Jira e abre o PR ao final, amarrando o que a `jira-ticket-context`, a `tech-lead`, a `stack-runner` e o agent `code-reviewer` já fazem, sem duplicar nenhuma delas. Use SEMPRE para começar uma task nova da sprint — "começa a SCRUM-60", "cria o worktree pra próxima task", "bora implementar a scrum-53" — e para encerrar uma já mergeada — "encerra a scrum-52", "o PR da scrum-54 já foi mergeado, fecha isso". Cobre só `server/`; `mobile/` está fora porque será reescrito do zero. Não decide regra de negócio (`business-analyst`) nem implementa código (`tech-lead` e as skills que ela aciona) — só decide quando cada uma entra, e nunca mergeia um PR sozinha.
---

# Sprint Task Workflow — EsliphFinance

O ciclo de uma task de sprint — worktree, stack Docker isolado, Jira, commits, PR — segue hoje uma convenção que só existe na prática, nos últimos worktrees em `.claude/worktrees/`, e em nenhum documento. Esta skill formaliza esse ciclo e o executa: ela é a casca em volta do que já existe, não uma peça nova de conteúdo. `jira-ticket-context`, `tech-lead`, `stack-runner` e o agent `code-reviewer` continuam fazendo exatamente o que já fazem; esta skill decide *quando* cada um entra e cobre a parte que nenhum deles cobre — git worktree, alocação de porta, `gh pr create` e as transições no Jira.

## Escopo

Cobre `server/` apenas. `mobile/` está fora — será reescrito do zero, e nada aqui deve condicionar esse desenho futuro.

Não decide nada de produto — isso é sempre `business-analyst`/`domain-architect`/`platform-architect`. Não implementa código — isso é sempre a `tech-lead` e as skills que ela aciona. Nunca mergeia um PR sozinha: merge é sempre decisão humana no GitHub.

## Decisões já fechadas

| Decisão | Escolha |
| --- | --- |
| Transições de Jira | Todas automáticas: `To Do → In Progress` no início, `In Progress → In Review` na abertura do PR, `In Review → Done` no encerramento |
| Gatilho do `Done` | Comando explícito de encerramento — não há observação em background de merge no GitHub |
| Abertura do PR | Automática, assim que o checklist de fechamento da `tech-lead` (passo 16) fechar limpo |
| Nomenclatura | Fixa: `feat/scrum-NN-<slug>` (ou `fix/`) em `.claude/worktrees/scrum-NN-<slug>`; sem ticket vira `chore/<slug>` em `.claude/worktrees/<slug>` |
| Porta Postgres | Reaproveita a menor porta livre (5441+) entre os worktrees **vivos** (`git worktree list`, não varredura de diretório) |
| Subida do stack | Automática: `make up` + `make db-migrate` fazem parte da criação do worktree |
```

- [ ] **Step 2: Validar o frontmatter**

Confirme que o YAML é válido e que a `description` cita as duas frases-gatilho (início e encerramento):

```sh
python3 -c "
import re
content = open('.claude/skills/sprint-task-workflow/SKILL.md').read()
fm = content.split('---')[1]
import yaml
d = yaml.safe_load(fm)
assert d['name'] == 'sprint-task-workflow'
assert 'começa a SCRUM' in d['description'] or 'começa a' in d['description']
assert 'encerra a scrum' in d['description'].lower()
print('frontmatter OK')
"
```

Expected: `frontmatter OK`. Se `pyyaml` não estiver instalado, valide a olho: chaves `name:`/`description:` presentes, sem tabs, aspas balanceadas.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/sprint-task-workflow/SKILL.md
git commit -m "feat: Iniciando skill sprint-task-workflow com objetivo, escopo e decisões"
```

---

### Task 2: Fluxo 1 — Início da task

**Files:**
- Modify: `.claude/skills/sprint-task-workflow/SKILL.md` (acrescenta `## Fluxo 1 — Início da task` ao final)

**Interfaces:**
- Consumes: nenhuma (primeiro fluxo do ciclo).
- Produces: a convenção de nome de branch/worktree e a variável de porta que os Fluxos 2 e 3 (Tasks 3 e 4) referenciam como já estabelecidas.

- [ ] **Step 1: Acrescentar o Fluxo 1 completo**

```markdown
## Fluxo 1 — Início da task

Gatilho: "começa a SCRUM-60", "cria o worktree pra próxima task da sprint".

### Passo 1 — Resolver a issue

Número explícito (`SCRUM-60` ou só `60`) usa direto. Descrição solta busca por JQL:

\`\`\`
mcp__atlassian__searchJiraIssuesUsingJql
  cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813
  jql: project = SCRUM AND status = "To Do" AND summary ~ "<termo>"
  fields: ["summary", "status"]
\`\`\`

Confirme o resultado com o usuário antes de seguir — não adivinhe qual issue é a certa entre várias. Sem ticket (pedido não referencia nenhuma issue), pule para o Passo 3 com `chore/<slug>`.

### Passo 2 — Ler a issue

Mesma lógica da `jira-ticket-context`:

\`\`\`
mcp__atlassian__getJiraIssue
  cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813
  issueIdOrKey: "SCRUM-<N>"
  responseContentFormat: "markdown"
\`\`\`

O `summary` vira o slug do branch (kebab-case, sem acento e sem palavra de parada). Se `status.name` já for `"In Progress"` ou `"In Review"`, **pare e avise** — pode haver um worktree ativo em outra sessão ou máquina para a mesma task; não crie um segundo.

### Passo 3 — Criar o worktree

\`\`\`sh
git worktree add .claude/worktrees/scrum-NN-<slug> -b feat/scrum-NN-<slug> develop
\`\`\`

Sem ticket (Passo 1 não achou issue), o padrão vira, sem o número:

\`\`\`sh
git worktree add .claude/worktrees/<slug> -b chore/<slug> develop
\`\`\`

Task de correção usa `fix/` no lugar de `feat/`, mesmo padrão de worktree.

### Passo 4 — Alocar a porta

A porta é reaproveitada entre os worktrees **vivos** — registrados em `git worktree list`, não qualquer diretório dentro de `.claude/worktrees/` (diretórios órfãos de worktree já removido não contam):

\`\`\`sh
git worktree list --porcelain | awk '/^worktree/{print $2}' | grep '\.claude/worktrees/' | while read -r wt; do
  [ -f "$wt/server/.env" ] && grep -oP 'POSTGRES_PORT="\K[0-9]+' "$wt/server/.env"
done | sort -n
\`\`\`

Pegue o menor inteiro a partir de `5441` que não aparecer nessa lista. Escreva `server/.env` do worktree novo (copiando de `server/.env.example` como base) com:

\`\`\`
STACK_SUFFIX="-scrum-NN"
POSTGRES_PORT="<porta alocada>"
\`\`\`

(Para `chore/<slug>` sem número, use o slug no lugar de `scrum-NN` no `STACK_SUFFIX`: `STACK_SUFFIX="-<slug>"`.)

### Passo 5 — Subir o ambiente

Via `stack-runner`, a partir do worktree novo:

\`\`\`sh
make -C .claude/worktrees/scrum-NN-<slug>/server up
make -C .claude/worktrees/scrum-NN-<slug>/server db-migrate
\`\`\`

### Passo 6 — Jira: To Do → In Progress

Resolva o id da transição pelo nome antes de aplicar — nunca hardcoded:

\`\`\`
mcp__atlassian__getTransitionsForJiraIssue
  cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813
  issueIdOrKey: "SCRUM-<N>"
# procure na lista "transitions" o item com name == "In Progress" e use o "id" dele

mcp__atlassian__transitionJiraIssue
  cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813
  issueIdOrKey: "SCRUM-<N>"
  transition: { id: "<id resolvido>" }
\`\`\`

Pule este passo inteiro quando não houver ticket (`chore/<slug>`).

### Passo 7 — Entregar para a tech-lead

Reporte branch, caminho do worktree, porta alocada e o resumo trazido pela `jira-ticket-context` (RNs, critérios de aceite). A partir daqui, a implementação em si — passos 1 a 14 do roteiro da `tech-lead` — roda **dentro do worktree criado**, não na raiz do repositório.
```

- [ ] **Step 2: Verificar a sintaxe da consulta JQL e o algoritmo de porta contra o estado real do repositório**

Rode a consulta somente-leitura de fato, para confirmar que a sintaxe está certa (não muta nada):

```
mcp__atlassian__searchJiraIssuesUsingJql
  cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813
  jql: project = SCRUM AND status = "To Do" ORDER BY updated DESC
  maxResults: 5
  fields: ["summary", "status"]
```

Expected: retorna issues com `status.name == "To Do"`, sem erro de sintaxe JQL.

Rode o trecho de shell do Passo 4 contra o repositório de verdade:

```sh
git worktree list --porcelain | awk '/^worktree/{print $2}' | grep '\.claude/worktrees/' | while read -r wt; do
  [ -f "$wt/server/.env" ] && grep -oP 'POSTGRES_PORT="\K[0-9]+' "$wt/server/.env"
done | sort -n
```

Expected: lista as portas dos worktrees que aparecem em `git worktree list` (hoje: `scrum-52`, `scrum-54`, `scrum-55`) — **não** deve incluir portas de diretórios órfãos como `scrum-35`/`scrum-42`, que não estão mais em `git worktree list`.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/sprint-task-workflow/SKILL.md
git commit -m "feat: Adicionando Fluxo 1 (início da task) à skill sprint-task-workflow"
```

---

### Task 3: Fluxo 2 — Fim da implementação (PR automático)

**Files:**
- Modify: `.claude/skills/sprint-task-workflow/SKILL.md` (acrescenta `## Fluxo 2 — Fim da implementação (PR automático)` ao final)

**Interfaces:**
- Consumes: branch `feat/scrum-NN-<slug>` e o resumo da issue (RNs, critérios de aceite) produzidos no Fluxo 1 (Task 2); o checklist de fechamento do passo 16 da `tech-lead`.
- Produces: o PR aberto e a issue em `In Review`, que o Fluxo 3 (Task 4) consome para o encerramento.

- [ ] **Step 1: Acrescentar o Fluxo 2 completo**

```markdown
## Fluxo 2 — Fim da implementação (PR automático)

Gatilho: o checklist de fechamento da `tech-lead` (passo 16) fecha limpo — `make check` verde, agent `code-reviewer` sem achado de especificação/camada/propriedade, `docs/domains/` ou `docs/architecture/` atualizados, commits feitos. Nenhum pedido extra é necessário — o fluxo dispara sozinho nesse momento.

### Passo 1 — Push

\`\`\`sh
git -C .claude/worktrees/scrum-NN-<slug> push -u origin feat/scrum-NN-<slug>
\`\`\`

### Passo 2 — Abrir o PR

\`\`\`sh
gh pr create --base develop --head feat/scrum-NN-<slug> \
  --title "<summary da issue>" \
  --body "$(cat <<'EOF'
## Resumo
<bullets a partir do "Objetivo" e dos "Critérios de aceite" trazidos pela jira-ticket-context no início>

## Ticket
SCRUM-NN
EOF
)"
\`\`\`

Sem ticket (`chore/<slug>`), o corpo do PR não tem a seção "Ticket".

### Passo 3 — Jira: In Progress → In Review

\`\`\`
mcp__atlassian__getTransitionsForJiraIssue
  cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813
  issueIdOrKey: "SCRUM-<N>"
# procure o item com name == "In Review" e use o "id" dele

mcp__atlassian__transitionJiraIssue
  cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813
  issueIdOrKey: "SCRUM-<N>"
  transition: { id: "<id resolvido>" }

mcp__atlassian__addCommentToJiraIssue
  cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813
  issueIdOrKey: "SCRUM-<N>"
  commentBody: "PR aberto: <url retornada pelo gh pr create>"
  contentFormat: "markdown"
\`\`\`

### Passo 4 — Reportar e parar

Devolva o link do PR. **Não mergeie** — merge é sempre decisão humana. Se o checklist da `tech-lead` não tiver fechado limpo, este fluxo nunca é acionado: a correção volta ao passo dono do assunto, e o `check` roda de novo antes de tentar outra vez.
```

- [ ] **Step 2: Verificar a sintaxe do `gh pr create` e da resolução de transição**

```sh
gh pr create --help | head -20
```

Expected: confirma que `--base`, `--head`, `--title` e `--body` são flags válidas da versão instalada do `gh` (2.63.2, já confirmada no ambiente).

Releia o Passo 3 e confirme que ele resolve o id de "In Review" pela mesma lógica do Fluxo 1 Passo 6 (nunca hardcoded) — checagem de consistência entre fluxos, não uma chamada real (a transição real muta a issue).

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/sprint-task-workflow/SKILL.md
git commit -m "feat: Adicionando Fluxo 2 (PR automático) à skill sprint-task-workflow"
```

---

### Task 4: Fluxo 3 — Encerrar a task

**Files:**
- Modify: `.claude/skills/sprint-task-workflow/SKILL.md` (acrescenta `## Fluxo 3 — Encerrar a task` ao final)

**Interfaces:**
- Consumes: o número do PR e a chave da issue, já em `In Review` pelo Fluxo 2 (Task 3).
- Produces: a issue em `Done`, o worktree e o stack removidos — libera a porta para o próximo Fluxo 1.

- [ ] **Step 1: Acrescentar o Fluxo 3 completo**

```markdown
## Fluxo 3 — Encerrar a task

Gatilho explícito e manual, depois do merge: "encerra a scrum-52, o PR já foi mergeado".

### Passo 1 — Confirmar o merge

\`\`\`sh
gh pr view <NN> --json state,mergedAt --jq '.state'
\`\`\`

Se a saída não for `MERGED`, **pare e avise** — não prossiga com um PR ainda aberto ou fechado sem merge.

### Passo 2 — Jira: In Review → Done

\`\`\`
mcp__atlassian__getTransitionsForJiraIssue
  cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813
  issueIdOrKey: "SCRUM-<N>"
# procure o item com name == "Done" e use o "id" dele

mcp__atlassian__transitionJiraIssue
  cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813
  issueIdOrKey: "SCRUM-<N>"
  transition: { id: "<id resolvido>" }
\`\`\`

Pule este passo quando não houver ticket (`chore/<slug>`).

### Passo 3 — Derrubar o stack

\`\`\`sh
make -C .claude/worktrees/scrum-NN-<slug>/server down
\`\`\`

`down`, não `clean` — preserva o volume; o worktree está saindo mesmo, mas `down` é o padrão menos destrutivo da `stack-runner` e evita surpresa se algo precisar ser reaproveitado antes da remoção.

### Passo 4 — Remover o worktree e o branch local

A partir da raiz do repositório:

\`\`\`sh
git worktree remove .claude/worktrees/scrum-NN-<slug>
git branch -d feat/scrum-NN-<slug>
\`\`\`

O branch remoto o próprio GitHub apaga no merge, se essa opção estiver ligada no repositório.

### Passo 5 — Reportar

Diga o que foi feito. A porta que a task usava fica livre para o próximo Fluxo 1, Passo 4.
```

- [ ] **Step 2: Verificar a sintaxe do `gh pr view` e a ordem de dependência entre os passos**

```sh
gh pr view --help | grep -A2 -- "--json"
```

Expected: confirma que `state` e `mergedAt` são campos válidos de `--json` na versão instalada.

Releia os Passos 3 e 4: confirme que `down` roda **antes** de `git worktree remove` (não dá para rodar `make -C <worktree>/server down` depois que o worktree já foi removido — o `Makefile` não existiria mais no caminho).

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/sprint-task-workflow/SKILL.md
git commit -m "feat: Adicionando Fluxo 3 (encerramento) à skill sprint-task-workflow"
```

---

### Task 5: Casos de borda, fora de escopo e checklist

**Files:**
- Modify: `.claude/skills/sprint-task-workflow/SKILL.md` (acrescenta as três seções finais)

**Interfaces:**
- Consumes: os três fluxos das Tasks 2–4 (o checklist referencia passos de cada um).
- Produces: o arquivo completo da skill, pronto para o dry run da Task 6.

- [ ] **Step 1: Acrescentar casos de borda, fora de escopo e checklist**

```markdown
## Casos de borda

- **Duas tasks "ao mesmo tempo"**: a skill não impede, mas repete o aviso já registrado em memória — tasks sequenciais ou da mesma entidade devem ser empilhadas, uma de cada vez, não paralelizadas: stacks simultâneos com e2e truncando tabelas (`RESTART IDENTITY CASCADE`) derrubam os dados um do outro.
- **Issue já em `In Progress` ou `In Review`** ao tentar começar (Fluxo 1, Passo 2): avisa em vez de seguir.
- **`gh pr view` falha ou o PR não existe** (Fluxo 3, Passo 1): reporta o erro, não tenta adivinhar o estado.

## Fora de escopo

- `mobile/` — fora enquanto não for reescrito.
- Merge do PR — sempre humano.
- Observação em background de merge no GitHub (webhook, polling) — o encerramento é sempre um comando explícito.
- Criação ou edição de issues no Jira — a skill só transiciona status e comenta o link do PR; criar ou detalhar uma issue continua manual ou por outra via.

## Checklist

- [ ] A issue foi resolvida por número ou confirmada por busca — nunca adivinhada entre várias
- [ ] Branch e worktree seguem a nomenclatura fixa (`feat`/`fix`/`chore`)
- [ ] A porta alocada não colide com nenhum worktree que aparece em `git worktree list`
- [ ] `make up` + `make db-migrate` rodaram antes de entregar para a `tech-lead`
- [ ] Toda transição de Jira resolveu o id pelo nome, nunca hardcoded
- [ ] O PR só abre depois do checklist do passo 16 da `tech-lead` fechar limpo
- [ ] O encerramento só mexe em algo depois de confirmar `MERGED` via `gh pr view`
- [ ] `make down` roda antes de `git worktree remove`, nunca depois
```

- [ ] **Step 2: Ler o arquivo inteiro e conferir contra a spec**

```sh
wc -l .claude/skills/sprint-task-workflow/SKILL.md
```

Releia `.claude/skills/sprint-task-workflow/SKILL.md` de ponta a ponta e confira cada seção da spec (`docs/sdd/specs/2026-08-20-sprint-task-workflow-design.md`) contra uma seção correspondente no arquivo — nenhuma decisão da tabela "Decisões" deve ficar sem uma seção que a aplique.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/sprint-task-workflow/SKILL.md
git commit -m "feat: Adicionando casos de borda, fora de escopo e checklist à skill sprint-task-workflow"
```

---

### Task 6: Ligar a skill ao roteiro da tech-lead e validar com dry run real

**Files:**
- Modify: `.claude/skills/tech-lead/SKILL.md`

**Interfaces:**
- Consumes: o arquivo completo da `sprint-task-workflow` (Tasks 1–5).
- Produces: nenhuma — última tarefa do plano.

- [ ] **Step 1: Referenciar a `sprint-task-workflow` na `tech-lead`**

Releia `.claude/skills/tech-lead/SKILL.md` (já tem, de trabalho anterior, um passo 0 chamando `jira-ticket-context` e um passo 15 chamando o agent `code-reviewer`). Ajuste a frase de abertura da tabela de roteiro para deixar explícito que o passo 0 e o fechamento (push + PR, passos 15–16) agora são cobertos pelos Fluxos 1 e 2 da `sprint-task-workflow` quando a task nasce de lá — sem duplicar o conteúdo, só apontando:

Localize a linha (já existente) que lista as skills acionadas pela `tech-lead`:

```
ela aciona a `jira-ticket-context`, `business-analyst`, `domain-architect`, `platform-architect`, `clean-code`, `spec-writer`, `code-reviewer` e `stack-runner` no momento certo
```

Troque por:

```
ela aciona a `business-analyst`, `domain-architect`, `platform-architect`, `clean-code`, `spec-writer`, `code-reviewer` e `stack-runner` no momento certo — quando a task nasce de uma issue Jira, o worktree, o passo 0 (`jira-ticket-context`) e o fechamento com PR (passos 15–16) já vêm prontos da `sprint-task-workflow`, que entrega para este roteiro só a implementação em si
```

- [ ] **Step 2: Commit da ligação**

```bash
git add .claude/skills/tech-lead/SKILL.md
git commit -m "docs: Ligando a tech-lead à skill sprint-task-workflow"
```

- [ ] **Step 3: Dry run real — só com confirmação explícita do usuário**

Este passo tem efeito colateral real (cria um worktree de verdade, sobe containers, move uma issue no Jira). **Pare aqui e pergunte ao usuário qual issue `To Do` de baixo risco do backlog usar** antes de prosseguir — não escolha uma sozinho.

Com a issue escolhida, execute o Fluxo 1 (Task 2) de ponta a ponta:

```sh
# Passo 3 do Fluxo 1
git worktree add .claude/worktrees/scrum-<N>-<slug> -b feat/scrum-<N>-<slug> develop

# Passo 4 do Fluxo 1 — confirme a porta alocada não colide com git worktree list
git worktree list --porcelain | awk '/^worktree/{print $2}' | grep '\.claude/worktrees/' | while read -r wt; do
  [ -f "$wt/server/.env" ] && grep -oP 'POSTGRES_PORT="\K[0-9]+' "$wt/server/.env"
done | sort -n

# Passo 5 do Fluxo 1
make -C .claude/worktrees/scrum-<N>-<slug>/server up
make -C .claude/worktrees/scrum-<N>-<slug>/server db-migrate
```

Confirme: stack sobe, migra sem erro, e a transição do Passo 6 (`To Do → In Progress`) aplica na issue de teste.

Expected: worktree criado, stack saudável (`make -C .claude/worktrees/scrum-<N>-<slug>/server ps`), issue em `In Progress` no Jira.

- [ ] **Step 4: Desfazer o dry run**

Execute o Fluxo 3 (Task 4) manualmente para desfazer, **sem** ter passado por um PR de verdade — ajuste o Passo 1: em vez de `gh pr view`, confirme direto com o usuário que é seguro descartar, então:

```sh
make -C .claude/worktrees/scrum-<N>-<slug>/server down
git worktree remove .claude/worktrees/scrum-<N>-<slug>
git branch -D feat/scrum-<N>-<slug>
```

E devolva a issue de teste ao estado original (`To Do`) via `mcp__atlassian__transitionJiraIssue`, para não deixar o board sujo por causa do dry run.

- [ ] **Step 5: Reportar o resultado do dry run ao usuário**

Sem commit neste passo — é validação, não mudança de arquivo.
