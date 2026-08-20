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
