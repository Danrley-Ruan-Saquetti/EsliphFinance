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
| Abertura do PR | Automática, assim que a seção `## O fechamento` da `tech-lead`, depois do passo 16, fechar limpo |
| Nomenclatura | Fixa: `feat/scrum-<N>-<slug>` (ou `fix/`) em `.claude/worktrees/scrum-<N>-<slug>`; sem ticket vira `chore/<slug>` em `.claude/worktrees/<slug>` |
| Porta Postgres | Reaproveita a menor porta livre (5441+) entre os worktrees **vivos** (`git worktree list`, não varredura de diretório) |
| Subida do stack | Automática: `make deps` + `make up` + `make db-migrate` fazem parte da criação do worktree |

## Fluxo 1 — Início da task

Gatilho: "começa a SCRUM-60", "cria o worktree pra próxima task da sprint".

Todo caminho usado nesta skill é relativo à raiz do repositório. Antes de rodar qualquer comando deste fluxo, resolva (ou dê `cd` para) a raiz — `git rev-parse --path-format=absolute --git-common-dir` devolve o `.git` comum, e o diretório pai dele é a raiz — o que é especialmente importante quando a sessão já está dentro de outro worktree.

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

Invoque a skill `jira-ticket-context` (via a ferramenta `Skill`) — é ela quem busca a issue e cruza as "Regras de negócio" e os "Critérios de aceite" da descrição com `docs/requirements.md`, escalando para a `business-analyst` quando algum critério não tiver RN correspondente. Por baixo, ela faz uma chamada equivalente a esta (ilustrativa, não é o passo em si nem substitui invocar a skill):

```
mcp__atlassian__getJiraIssue
  cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813
  issueIdOrKey: "SCRUM-<N>"
  responseContentFormat: "markdown"
```

O `summary` vira o slug do branch (kebab-case, sem acento e sem palavra de parada). Se `status.name` já for `"In Progress"` ou `"In Review"`, **pare e avise** — pode haver um worktree ativo em outra sessão ou máquina para a mesma task; não crie um segundo.

### Passo 3 — Criar o worktree

Atualize a referência local de `develop` antes de ramificar, para não partir de uma base desatualizada em relação a `origin/develop`:

```sh
git fetch origin develop
git worktree add .claude/worktrees/scrum-<N>-<slug> -b feat/scrum-<N>-<slug> develop
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
STACK_SUFFIX="-scrum-<N>"
POSTGRES_PORT="<porta alocada>"
```

(Para `chore/<slug>` sem número, use o slug no lugar de `scrum-<N>` no `STACK_SUFFIX`: `STACK_SUFFIX="-<slug>"`.)

### Passo 5 — Subir o ambiente

Via `stack-runner`, referenciando o worktree novo via `-C`:

```sh
make -C .claude/worktrees/scrum-<N>-<slug>/server deps
make -C .claude/worktrees/scrum-<N>-<slug>/server up
make -C .claude/worktrees/scrum-<N>-<slug>/server db-migrate
```

### Passo 6 — Jira: To Do → In Progress

Resolva o id da transição pelo nome do status de destino antes de aplicar — nunca hardcoded. Na resposta de `getTransitionsForJiraIssue`, `transitions[].name` é o rótulo da ação e é customizável (pode ser "start task", "review", qualquer coisa) — não é confiável; `transitions[].to.name` é o nome estável do status de destino, e é nele que a resolução deve se basear:

```
mcp__atlassian__getTransitionsForJiraIssue
  cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813
  issueIdOrKey: "SCRUM-<N>"
# procure na lista "transitions" o item cujo "to.name" seja "In Progress" e use o "id" dele

mcp__atlassian__transitionJiraIssue
  cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813
  issueIdOrKey: "SCRUM-<N>"
  transition: { id: "<id resolvido>" }
```

Pule este passo inteiro quando não houver ticket (`chore/<slug>`).

### Passo 7 — Entregar para a tech-lead

Reporte branch, caminho do worktree, porta alocada e o resumo trazido pela `jira-ticket-context` (RNs, critérios de aceite). A partir daqui, a implementação em si — passos 1 a 14 do roteiro da `tech-lead` — roda **dentro do worktree criado**, não na raiz do repositório.

## Fluxo 2 — Fim da implementação (PR automático)

Gatilho: a seção `## O fechamento` da `tech-lead`, depois do passo 16, fecha limpo — `make check` verde, agent `code-reviewer` sem achado de especificação/camada/propriedade, `docs/domains/` ou `docs/architecture/` atualizados, commit feito. Nenhum pedido extra é necessário — o fluxo dispara sozinho nesse momento.

### Passo 1 — Push

```sh
git -C .claude/worktrees/scrum-<N>-<slug> push -u origin feat/scrum-<N>-<slug>
```

### Passo 2 — Abrir o PR

```sh
gh pr create --base develop --head feat/scrum-<N>-<slug> \
  --title "<summary da issue>" \
  --body "$(cat <<'EOF'
## Resumo
<bullets a partir do "Objetivo" e dos "Critérios de aceite" trazidos pela jira-ticket-context no início>

## Ticket
SCRUM-<N>
EOF
)"
```

Sem ticket (`chore/<slug>`), o corpo do PR não tem a seção "Ticket".

### Passo 3 — Jira: In Progress → In Review

```
mcp__atlassian__getTransitionsForJiraIssue
  cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813
  issueIdOrKey: "SCRUM-<N>"
# procure na lista "transitions" o item cujo "to.name" seja "In Review" e use o "id" dele

mcp__atlassian__transitionJiraIssue
  cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813
  issueIdOrKey: "SCRUM-<N>"
  transition: { id: "<id resolvido>" }

mcp__atlassian__addCommentToJiraIssue
  cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813
  issueIdOrKey: "SCRUM-<N>"
  commentBody: "PR aberto: <url retornada pelo gh pr create>"
  contentFormat: "markdown"
```

### Passo 4 — Reportar e parar

Devolva o link do PR. **Não mergeie** — merge é sempre decisão humana. Se a seção `## O fechamento` da `tech-lead` não tiver fechado limpo, este fluxo nunca é acionado: a correção volta ao passo dono do assunto, e o `check` roda de novo antes de tentar outra vez.

## Fluxo 3 — Encerrar a task

Gatilho explícito e manual, depois do merge: "encerra a scrum-52, o PR já foi mergeado".

### Passo 1 — Descobrir o worktree e o branch

Uma sessão fria só recebe o número da SCRUM nesse gatilho — não sabe o caminho do worktree nem o nome completo do branch. Descubra os dois a partir de `git worktree list` antes de qualquer outro passo, e use exatamente o branch encontrado (nunca um nome reconstruído a partir do padrão) no resto deste fluxo:

```sh
git worktree list --porcelain | grep -B2 "scrum-<N>"
```

A saída traz o `worktree <caminho>` e, logo depois, o `branch refs/heads/<branch>` correspondentes (ajuste o `grep`/`awk` conforme o formato retornado). Extraia `<caminho>` e `<branch>` — por exemplo `feat/scrum-<N>-<slug>`, `fix/scrum-<N>-<slug>` ou, sem número, `chore/<slug>` — e siga com esses valores nos passos seguintes.

### Passo 2 — Confirmar o merge

`gh pr view` aceita o nome do branch diretamente, o que evita depender do número do PR — que não tem nenhuma relação com o número da SCRUM (confirmado: o PR da SCRUM-52 é o #27):

```sh
gh pr view <branch> --json state,mergedAt --jq '.state'
```

Se a saída não for `MERGED`, **pare e avise** — não prossiga com um PR ainda aberto ou fechado sem merge.

### Passo 3 — Jira: In Review → Done

```
mcp__atlassian__getTransitionsForJiraIssue
  cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813
  issueIdOrKey: "SCRUM-<N>"
# procure na lista "transitions" o item cujo "to.name" seja "Done" e use o "id" dele

mcp__atlassian__transitionJiraIssue
  cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813
  issueIdOrKey: "SCRUM-<N>"
  transition: { id: "<id resolvido>" }
```

Pule este passo quando não houver ticket (`chore/<slug>`).

### Passo 4 — Derrubar o stack

```sh
make -C <caminho do worktree>/server down
```

`down`, não `clean` — preserva o volume; o worktree está saindo mesmo, mas `down` é o padrão menos destrutivo da `stack-runner` e evita surpresa se algo precisar ser reaproveitado antes da remoção.

### Passo 5 — Remover o worktree e o branch local

A partir da raiz do repositório, usando o caminho e o branch descobertos no Passo 1:

```sh
git worktree remove <caminho do worktree>
git branch -D <branch>
```

`-D`, não `-d`: o Passo 2 já confirmou `MERGED` pela API do GitHub, então usar `-D` é seguro mesmo que o `develop` local esteja desatualizado e o `-d` recuse com "not fully merged" — e cobre `feat/`, `fix/` e `chore/` igualmente, sem prefixo hardcoded. O branch remoto o próprio GitHub apaga no merge, se essa opção estiver ligada no repositório.

### Passo 6 — Reportar

Diga o que foi feito. A porta que a task usava fica livre para o próximo Fluxo 1, Passo 4.

## Casos de borda

- **Duas tasks "ao mesmo tempo"**: a skill não impede, mas repete o aviso já registrado em memória — tasks sequenciais ou da mesma entidade devem ser empilhadas, uma de cada vez, não paralelizadas: stacks simultâneos com e2e truncando tabelas (`RESTART IDENTITY CASCADE`) derrubam os dados um do outro.
- **Issue já em `In Progress` ou `In Review`** ao tentar começar (Fluxo 1, Passo 2): avisa em vez de seguir.
- **`gh pr view` falha ou o PR não existe** (Fluxo 3, Passo 2): reporta o erro, não tenta adivinhar o estado.

## Fora de escopo

- `mobile/` — fora enquanto não for reescrito.
- Merge do PR — sempre humano.
- Observação em background de merge no GitHub (webhook, polling) — o encerramento é sempre um comando explícito.
- Criação ou edição de issues no Jira — a skill só transiciona status e comenta o link do PR; criar ou detalhar uma issue continua manual ou por outra via.

## Checklist

- [ ] A issue foi resolvida por número ou confirmada por busca — nunca adivinhada entre várias
- [ ] Branch e worktree seguem a nomenclatura fixa (`feat`/`fix`/`chore`)
- [ ] A porta alocada não colide com nenhum worktree que aparece em `git worktree list`
- [ ] `make deps` + `make up` + `make db-migrate` rodaram antes de entregar para a `tech-lead`
- [ ] Toda transição de Jira resolveu o id pelo `to.name` do status de destino, nunca pelo `name` da ação nem hardcoded
- [ ] O PR só abre depois de a seção `## O fechamento` da `tech-lead`, depois do passo 16, fechar limpo
- [ ] O encerramento só mexe em algo depois de confirmar `MERGED` via `gh pr view`
- [ ] `make down` roda antes de `git worktree remove`, nunca depois
