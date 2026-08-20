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

## Fluxo 1 — Início da task

Gatilho: "começa a SCRUM-60", "cria o worktree pra próxima task da sprint".

### Passo 1 — Resolver a issue

Número explícito (`SCRUM-60` ou só `60`) usa direto. Descrição solta busca por JQL:

```
mcp__atlassian__searchJiraIssuesUsingJql
  cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813
  jql: project = SCRUM AND status = "To Do" AND summary ~ "<termo>"
  fields: ["summary", "status"]
```

Confirme o resultado com o usuário antes de seguir — não adivinhe qual issue é a certa entre várias. Sem ticket (pedido não referencia nenhuma issue), pule para o Passo 3 com `chore/<slug>`.

### Passo 2 — Ler a issue

Mesma lógica da `jira-ticket-context`:

```
mcp__atlassian__getJiraIssue
  cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813
  issueIdOrKey: "SCRUM-<N>"
  responseContentFormat: "markdown"
```

O `summary` vira o slug do branch (kebab-case, sem acento e sem palavra de parada). Se `status.name` já for `"In Progress"` ou `"In Review"`, **pare e avise** — pode haver um worktree ativo em outra sessão ou máquina para a mesma task; não crie um segundo.

### Passo 3 — Criar o worktree

```sh
git worktree add .claude/worktrees/scrum-NN-<slug> -b feat/scrum-NN-<slug> develop
```

Sem ticket (Passo 1 não achou issue), o padrão vira, sem o número:

```sh
git worktree add .claude/worktrees/<slug> -b chore/<slug> develop
```

Task de correção usa `fix/` no lugar de `feat/`, mesmo padrão de worktree.

### Passo 4 — Alocar a porta

A porta é reaproveitada entre os worktrees **vivos** — registrados em `git worktree list`, não qualquer diretório dentro de `.claude/worktrees/` (diretórios órfãos de worktree já removido não contam):

```sh
git worktree list --porcelain | awk '/^worktree/{print $2}' | grep '\.claude/worktrees/' | while read -r wt; do
  [ -f "$wt/server/.env" ] && grep -oP 'POSTGRES_PORT="\K[0-9]+' "$wt/server/.env"
done | sort -n
```

Pegue o menor inteiro a partir de `5441` que não aparecer nessa lista. Escreva `server/.env` do worktree novo (copiando de `server/.env.example` como base) com:

```
STACK_SUFFIX="-scrum-NN"
POSTGRES_PORT="<porta alocada>"
```

(Para `chore/<slug>` sem número, use o slug no lugar de `scrum-NN` no `STACK_SUFFIX`: `STACK_SUFFIX="-<slug>"`.)

### Passo 5 — Subir o ambiente

Via `stack-runner`, a partir do worktree novo:

```sh
make -C .claude/worktrees/scrum-NN-<slug>/server up
make -C .claude/worktrees/scrum-NN-<slug>/server db-migrate
```

### Passo 6 — Jira: To Do → In Progress

Resolva o id da transição pelo nome antes de aplicar — nunca hardcoded:

```
mcp__atlassian__getTransitionsForJiraIssue
  cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813
  issueIdOrKey: "SCRUM-<N>"
# procure na lista "transitions" o item com name == "In Progress" e use o "id" dele

mcp__atlassian__transitionJiraIssue
  cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813
  issueIdOrKey: "SCRUM-<N>"
  transition: { id: "<id resolvido>" }
```

Pule este passo inteiro quando não houver ticket (`chore/<slug>`).

### Passo 7 — Entregar para a tech-lead

Reporte branch, caminho do worktree, porta alocada e o resumo trazido pela `jira-ticket-context` (RNs, critérios de aceite). A partir daqui, a implementação em si — passos 1 a 14 do roteiro da `tech-lead` — roda **dentro do worktree criado**, não na raiz do repositório.
