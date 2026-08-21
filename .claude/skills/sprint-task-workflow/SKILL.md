---
name: sprint-task-workflow
description: O orquestrador do ciclo de uma task de sprint do EsliphFinance — cria o worktree isolado, sobe um stack Docker próprio, move a issue no Jira e abre o PR ao final, amarrando o que a `jira-ticket-context`, a `tech-lead`, a `stack-runner` e o agent `code-reviewer` já fazem, sem duplicar nenhuma delas. Use SEMPRE para começar uma task nova da sprint — "começa a LIPH-60", "cria o worktree pra próxima task", "bora implementar a liph-53" —, para encerrar uma já mergeada — "encerra a liph-52", "o PR da liph-54 já foi mergeado, fecha isso" — e para rodar várias tasks independentes ao mesmo tempo, cada uma isolada no próprio worktree e stack — "paraleliza LIPH-60, LIPH-64 e LIPH-70", "roda essas 3 tasks em paralelo". Cobre só `server/`; `mobile/` está fora porque será reescrito do zero. Não decide regra de negócio (`business-analyst`) nem implementa código (`tech-lead` e as skills que ela aciona) — só decide quando cada uma entra, e nunca mergeia um PR sozinha.
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
| Nomenclatura | Fixa: `feat/liph-<N>-<slug>` (ou `fix/`) em `.claude/worktrees/liph-<N>-<slug>`; sem ticket vira `chore/<slug>` em `.claude/worktrees/<slug>` |
| Porta Postgres | Reaproveita a menor porta livre (5441+) entre os worktrees **vivos** (`git worktree list`, não varredura de diretório) |
| Subida do stack | Automática: `make deps` + `make up` + `make db-migrate` fazem parte da criação do worktree |
| Orquestração da paralelização | Subagentes autônomos (`Agent` tool), um por task — cada um roda o ciclo completo (jira-ticket-context → tech-lead → code-reviewer → PR) dentro do próprio worktree |
| Entrada da paralelização | Só lista explícita de números de ticket — nunca infere do backlog |
| Teto de paralelismo | 4 tasks por leva do Fluxo 4 — não um teto global de porta: com worktrees já vivos fora da leva, as portas alocadas podem cair fora de 5441–5444; N>4 é recusado com aviso |
| Checagem de domínio sobreposto | Avisa se duas tasks da leva caírem no mesmo contexto de `docs/domains/` e confirma pontualmente antes de seguir com aquele par — não bloqueia as demais |
| Report da paralelização | Por task, assim que o subagente correspondente termina — a sessão orquestradora não espera as N |
| Tipo de subagente | `Agent` com `subagent_type: "general-purpose"` — nunca `fork`, porque cada task precisa de contexto próprio, não do histórico da conversa que disparou a leva |
| `make check`/e2e dentro do subagente | Sempre em foreground, nunca aguardando notificação de monitor próprio; serial pela `stack-runner`, nunca via `check-dispatcher` — paralelizar o check dentro de cada task multiplicaria as N tasks da leva por 3 subagentes de check |

## Fluxo 1 — Início da task

Gatilho: "começa a LIPH-60", "cria o worktree pra próxima task da sprint".

Todo caminho usado nesta skill é relativo à raiz do repositório. Antes de rodar qualquer comando de qualquer fluxo desta skill, resolva (ou dê `cd` para) a raiz — `git rev-parse --path-format=absolute --git-common-dir` devolve o `.git` comum, e o diretório pai dele é a raiz — o que é especialmente importante quando a sessão já está dentro de outro worktree.

### Passo 1 — Resolver a issue

Número explícito (`LIPH-60` ou só `60`) usa direto. Descrição solta busca por JQL:

```
mcp__atlassian__searchJiraIssuesUsingJql
  cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813
  jql: project = LIPH AND status = "To Do" AND summary ~ "<termo>"
  fields: ["summary", "status"]
```

Confirme o resultado com o usuário antes de seguir — não adivinhe qual issue é a certa entre várias. Sem ticket (pedido não referencia nenhuma issue), pule para o Passo 3 com `chore/<slug>`.

### Passo 2 — Ler a issue

Invoque a skill `jira-ticket-context` (via a ferramenta `Skill`) — é ela quem busca a issue e cruza as "Regras de negócio" e os "Critérios de aceite" da descrição com `docs/requirements.md`, escalando para a `business-analyst` quando algum critério não tiver RN correspondente. Por baixo, ela faz uma chamada equivalente a esta (ilustrativa, não é o passo em si nem substitui invocar a skill):

```
mcp__atlassian__getJiraIssue
  cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813
  issueIdOrKey: "LIPH-<N>"
  responseContentFormat: "markdown"
```

O `summary` vira o slug do branch (kebab-case, sem acento e sem palavra de parada). Se `status.name` já for `"In Progress"` ou `"In Review"`, **pare e avise** — pode haver um worktree ativo em outra sessão ou máquina para a mesma task; não crie um segundo.

### Passo 3 — Criar o worktree

Atualize a referência local de `develop` antes de ramificar, para não partir de uma base desatualizada em relação a `origin/develop`:

```sh
git fetch origin develop
git worktree add .claude/worktrees/liph-<N>-<slug> -b feat/liph-<N>-<slug> develop
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
STACK_SUFFIX="-liph-<N>"
POSTGRES_PORT="<porta alocada>"
```

(Para `chore/<slug>` sem número, use o slug no lugar de `liph-<N>` no `STACK_SUFFIX`: `STACK_SUFFIX="-<slug>"`.)

### Passo 5 — Subir o ambiente

Via `stack-runner`, referenciando o worktree novo via `-C`:

```sh
make -C .claude/worktrees/liph-<N>-<slug>/server deps
make -C .claude/worktrees/liph-<N>-<slug>/server up
make -C .claude/worktrees/liph-<N>-<slug>/server db-migrate
```

### Passo 6 — Jira: To Do → In Progress

Resolva o id da transição pelo nome do status de destino antes de aplicar — nunca hardcoded. Na resposta de `getTransitionsForJiraIssue`, `transitions[].name` é o rótulo da ação e é customizável (pode ser "start task", "review", qualquer coisa) — não é confiável; `transitions[].to.name` é o nome estável do status de destino, e é nele que a resolução deve se basear:

```
mcp__atlassian__getTransitionsForJiraIssue
  cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813
  issueIdOrKey: "LIPH-<N>"
# procure na lista "transitions" o item cujo "to.name" seja "In Progress" e use o "id" dele

mcp__atlassian__transitionJiraIssue
  cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813
  issueIdOrKey: "LIPH-<N>"
  transition: { id: "<id resolvido>" }
```

Pule este passo inteiro quando não houver ticket (`chore/<slug>`).

### Passo 7 — Entregar para a tech-lead

Reporte branch, caminho do worktree, porta alocada e o resumo trazido pela `jira-ticket-context` (RNs, critérios de aceite). A partir daqui, a implementação em si — passos 1 a 14 do roteiro da `tech-lead` — roda **dentro do worktree criado**, não na raiz do repositório.

## Fluxo 2 — Fim da implementação (PR automático)

Gatilho: a seção `## O fechamento` da `tech-lead`, depois do passo 16, fecha limpo — `make check` verde, agent `code-reviewer` sem achado de especificação/camada/propriedade, `docs/domains/` ou `docs/architecture/` atualizados, commit feito. Nenhum pedido extra é necessário — o fluxo dispara sozinho nesse momento.

### Passo 1 — Push

```sh
git -C .claude/worktrees/liph-<N>-<slug> push -u origin feat/liph-<N>-<slug>
```

### Passo 2 — Abrir o PR

```sh
gh pr create --base develop --head feat/liph-<N>-<slug> \
  --title "<summary da issue>" \
  --body "$(cat <<'EOF'
## Resumo
<bullets a partir do "Objetivo" e dos "Critérios de aceite" trazidos pela jira-ticket-context no início>

## Ticket
LIPH-<N>
EOF
)"
```

Sem ticket (`chore/<slug>`), o corpo do PR não tem a seção "Ticket".

### Passo 3 — Jira: In Progress → In Review

```
mcp__atlassian__getTransitionsForJiraIssue
  cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813
  issueIdOrKey: "LIPH-<N>"
# procure na lista "transitions" o item cujo "to.name" seja "In Review" e use o "id" dele

mcp__atlassian__transitionJiraIssue
  cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813
  issueIdOrKey: "LIPH-<N>"
  transition: { id: "<id resolvido>" }

mcp__atlassian__addCommentToJiraIssue
  cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813
  issueIdOrKey: "LIPH-<N>"
  commentBody: "PR aberto: <url retornada pelo gh pr create>"
  contentFormat: "markdown"
```

### Passo 4 — Reportar e parar

Devolva o link do PR. **Não mergeie** — merge é sempre decisão humana. Se a seção `## O fechamento` da `tech-lead` não tiver fechado limpo, este fluxo nunca é acionado: a correção volta ao passo dono do assunto, e o `check` roda de novo antes de tentar outra vez.

## Fluxo 3 — Encerrar a task

Gatilho explícito e manual, depois do merge: "encerra a liph-52, o PR já foi mergeado".

### Passo 1 — Descobrir o worktree e o branch

Uma sessão fria só recebe o número da LIPH nesse gatilho — não sabe o caminho do worktree nem o nome completo do branch. Descubra os dois a partir de `git worktree list` antes de qualquer outro passo, e use exatamente o branch encontrado (nunca um nome reconstruído a partir do padrão) no resto deste fluxo:

```sh
git worktree list --porcelain | grep -B2 "liph-<N>"
```

A saída traz o `worktree <caminho>` e, logo depois, o `branch refs/heads/<branch>` correspondentes (ajuste o `grep`/`awk` conforme o formato retornado). Extraia `<caminho>` e `<branch>` — por exemplo `feat/liph-<N>-<slug>`, `fix/liph-<N>-<slug>` ou, sem número, `chore/<slug>` — e siga com esses valores nos passos seguintes.

### Passo 2 — Confirmar o merge

`gh pr view` aceita o nome do branch diretamente, o que evita depender do número do PR — que não tem nenhuma relação com o número da LIPH (confirmado: o PR da LIPH-52 é o #27):

```sh
gh pr view <branch> --json state,mergedAt --jq '.state'
```

Se a saída não for `MERGED`, **pare e avise** — não prossiga com um PR ainda aberto ou fechado sem merge.

### Passo 3 — Jira: In Review → Done

```
mcp__atlassian__getTransitionsForJiraIssue
  cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813
  issueIdOrKey: "LIPH-<N>"
# procure na lista "transitions" o item cujo "to.name" seja "Done" e use o "id" dele

mcp__atlassian__transitionJiraIssue
  cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813
  issueIdOrKey: "LIPH-<N>"
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

## Fluxo 4 — Paralelização multi-worktree

Gatilho: lista explícita de tickets — "paraleliza LIPH-60, LIPH-64 e LIPH-70", "roda essas N tasks em paralelo", "começa essas 3 ao mesmo tempo".

### Passo 1 — Resolver e validar a leva

Faça o parse dos N números citados. Se N > 4, **recusa com aviso** — não segue com uma subleva silenciosa dos 4 primeiros.

Para cada ticket restante:

```
mcp__atlassian__getJiraIssue
  cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813
  issueIdOrKey: "LIPH-<N>"
  responseContentFormat: "markdown"
```

O `status.name` precisa ser `"To Do"`. Um ticket que já estiver `"In Progress"` ou `"In Review"` sai da leva com aviso — mesma regra do Fluxo 1, Passo 2, de não criar um segundo worktree para uma task já em andamento — mas **não aborta a leva inteira**: as demais seguem.

### Passo 2 — Ler as N issues e checar domínio sobreposto

Reaproveite o payload já obtido no Passo 1 (`getJiraIssue` por ticket) quando possível, em vez de buscar a issue de novo do zero.

Antes de criar qualquer worktree, invoque a skill `jira-ticket-context` (via `Skill`) para cada ticket restante da leva, sequencialmente — são só chamadas MCP de leitura. Cada resultado dá o slug do branch (do `summary`) e o cruzamento de RNs/critérios de aceite com `docs/requirements.md`, exatamente como o Fluxo 1, Passo 2 faz para uma task.

Use esse mesmo resultado para inferir o contexto de domínio de cada task (comparando o `summary`/descrição contra os nomes de contexto em `docs/domains/` — hoje `user`, `account-group`, `account`, `category`, `transaction`). Se duas ou mais tasks da leva caírem no mesmo contexto, avise a colisão e peça confirmação pontual antes de seguir com aquele par especificamente — as tasks sem colisão não esperam por essa confirmação. O risco de domínio sobreposto não é só colisão de dados (isso o isolamento por `STACK_SUFFIX`/porta já resolve): é migration/schema conflitante — duas tasks criando migrations Drizzle diferentes sobre a mesma tabela — ou uma branch que só compila se a outra já existir. Se for esse o caso, o caminho correto é empilhar as duas tasks (uma branch nascendo da outra), não usar o Fluxo 4 para esse par.

### Passo 3 — Alocar as N portas e criar os N worktrees

Calcule, na própria sessão orquestradora, as N menores portas livres a partir de 5441 entre os worktrees **vivos** (mesma consulta do Fluxo 1, Passo 4):

```sh
git worktree list --porcelain | awk '/^worktree/{print $2}' | grep '\.claude/worktrees/' | while read -r wt; do
  [ -f "$wt/server/.env" ] && grep -oP 'POSTGRES_PORT="\K[0-9]+' "$wt/server/.env"
done | sort -n
```

Pegue os N menores inteiros a partir de `5441` que não aparecerem nessa lista — **tudo antes de disparar qualquer subagente**, para não ter dois subagentes lendo o mesmo estado em paralelo e reservando a mesma porta.

Para cada task, crie o worktree (mesmo padrão do Fluxo 1, Passo 3):

```sh
git fetch origin develop
git worktree add .claude/worktrees/liph-<N>-<slug> -b feat/liph-<N>-<slug> develop
```

Task de correção usa `fix/` no lugar de `feat/`, mesmo padrão de worktree.

E escreva o `server/.env` de cada um (copiando de `server/.env.example` como base):

```
STACK_SUFFIX="-liph-<N>"
POSTGRES_PORT="<porta alocada>"
```

### Passo 4 — Jira: To Do → In Progress

Para cada task restante da leva, sequencial, mesma resolução de `id` pelo `to.name` do Fluxo 1, Passo 6:

```
mcp__atlassian__getTransitionsForJiraIssue
  cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813
  issueIdOrKey: "LIPH-<N>"
# procure na lista "transitions" o item cujo "to.name" seja "In Progress" e use o "id" dele

mcp__atlassian__transitionJiraIssue
  cloudId: 7039d0db-cf55-4ded-a609-ee57f5164813
  issueIdOrKey: "LIPH-<N>"
  transition: { id: "<id resolvido>" }
```

### Passo 5 — Subir os N stacks

Via `stack-runner`. Dentro de um worktree, as três etapas são **sequenciais** — `db-migrate` depende do `database` já saudável, que só `up` garante — então encadeie com `&&` num único comando por worktree. O paralelismo é **entre worktrees**, não dentro de um: dispare uma chamada de shell por worktree na mesma mensagem, cada uma com as três etapas encadeadas — cada stack usa porta, `STACK_SUFFIX` e volume próprios, então não há disputa de recurso entre eles:

```sh
make -C .claude/worktrees/liph-<N1>-<slug1>/server deps && \
make -C .claude/worktrees/liph-<N1>-<slug1>/server up && \
make -C .claude/worktrees/liph-<N1>-<slug1>/server db-migrate
```

(repita para cada worktree da leva, em chamadas paralelas — uma chamada de shell por worktree, nunca dividindo as três etapas de um mesmo worktree entre chamadas paralelas)

### Passo 6 — Disparar os N subagentes em uma única mensagem paralela

Uma chamada `Agent` por task, todas na mesma mensagem — paralelas de fato, não sequenciais. `subagent_type: "general-purpose"`, nunca `fork`. Cada prompt é autocontido e inclui:

- O `LIPH-<N>` da task e o `summary` da issue — necessários para o Fluxo 2 (título do PR, transição Jira).
- Caminho do worktree e nome do branch já criados no Passo 3.
- Porta alocada.
- O resumo de RNs/critérios de aceite que a `jira-ticket-context` já trouxe no Passo 2 — o subagente **não** reinvoca `jira-ticket-context`, parte direto do roteiro da `tech-lead` a partir de onde ela normalmente entra.
- Instrução explícita de rodar `make check` em **foreground** dentro do próprio subagente, nunca aguardando notificação de um monitor próprio — serial, nunca via `check-dispatcher`: a task já é um dos N subagentes da leva, e disparar mais três dentro dela multiplicaria o fan-out.
- Instrução de, ao fechar limpo (checklist "O fechamento" da `tech-lead`), executar o Fluxo 2 já existente por conta própria: push, `gh pr create`, transição Jira In Progress → In Review, comentário com o link do PR.
- Instrução de, se travar em algo que precise de decisão humana (critério sem RN correspondente, ambiguidade de regra), escalar como a `tech-lead`/`business-analyst` já fariam numa sessão solo, e reportar o bloqueio como resultado — não travar silenciosamente.

### Passo 7 — Reportar conforme cada subagente termina

A sessão orquestradora não aguarda as N tasks para reportar; cada notificação de subagente concluído (sucesso com link do PR, ou bloqueio) é repassada ao usuário assim que chega.

## Casos de borda

- **Duas ou mais tasks ao mesmo tempo**: o caminho suportado é o **Fluxo 4** — cada worktree com `STACK_SUFFIX`/`POSTGRES_PORT` próprios não compartilha banco, então não há colisão de dados entre stacks corretamente isolados. Fora do Fluxo 4 (worktrees criados manualmente, sem `.env` próprio), o aviso original continua valendo: tasks sequenciais ou da mesma entidade devem ser empilhadas, uma de cada vez — um worktree sem `STACK_SUFFIX` cai de volta no banco da raiz, e como cada spec e2e trunca as tabelas com `RESTART IDENTITY CASCADE`, duas suítes simultâneas nesse cenário derrubam os dados uma da outra.
- **N > 4 no Fluxo 4**: recusa, não trunca silenciosamente a leva para os 4 primeiros.
- **Ticket já em progresso dentro da leva do Fluxo 4**: sai da leva com aviso, as demais seguem.
- **Domínio sobreposto entre duas tasks da leva do Fluxo 4**: avisa e confirma pontualmente, não aborta as tasks sem colisão. O risco real não é colisão de dados (isso o isolamento de stack já resolve) — é migration/schema conflitante (migrations Drizzle diferentes sobre a mesma tabela) ou branch que só compila se a outra já existir; nesse caso o caminho correto é empilhar as duas tasks, não usar o Fluxo 4 para esse par.
- **Porta ou branch já em uso por um worktree vivo fora da leva**: `git worktree add -b feat/liph-<N>-<slug>` falha se o branch já existir (ex.: a mesma LIPH sendo trabalhada fora desta leva, pelo Fluxo 1 normal) — pula essa task específica com aviso, sem abortar a leva.
- **`make db-studio` entre dois worktrees da leva**: é o único alvo que publica porta fixa (padrão 4983, ver `server/CLAUDE.md`) — dois worktrees da leva não conseguem abri-lo simultaneamente sem `STUDIO_PORT=` diferente por worktree.
- **Um subagente do Fluxo 4 trava ou bloqueia**: os demais seguem independentes; o bloqueio é reportado como resultado daquela task, não propagado às outras.
- **Issue já em `In Progress` ou `In Review`** ao tentar começar (Fluxo 1, Passo 2): avisa em vez de seguir.
- **`gh pr view` falha ou o PR não existe** (Fluxo 3, Passo 2): reporta o erro, não tenta adivinhar o estado.

## Fora de escopo

- `mobile/` — fora enquanto não for reescrito.
- Merge do PR — sempre humano.
- Observação em background de merge no GitHub (webhook, polling) — o encerramento é sempre um comando explícito.
- Criação ou edição de issues no Jira — a skill só transiciona status e comenta o link do PR; criar ou detalhar uma issue continua manual ou por outra via.
- Encerramento em lote de várias tasks de uma vez — cada uma encerra individualmente pelo Fluxo 3, mesmo quando criada via Fluxo 4.
- Qualquer paralelismo dentro de uma única task — isso continua sendo assunto da `tech-lead`.

## Checklist

- [ ] A issue foi resolvida por número ou confirmada por busca — nunca adivinhada entre várias
- [ ] Branch e worktree seguem a nomenclatura fixa (`feat`/`fix`/`chore`)
- [ ] A porta alocada não colide com nenhum worktree que aparece em `git worktree list`
- [ ] `make deps` + `make up` + `make db-migrate` rodaram antes de entregar para a `tech-lead`
- [ ] Toda transição de Jira resolveu o id pelo `to.name` do status de destino, nunca pelo `name` da ação nem hardcoded
- [ ] O PR só abre depois de a seção `## O fechamento` da `tech-lead`, depois do passo 16, fechar limpo
- [ ] O encerramento só mexe em algo depois de confirmar `MERGED` via `gh pr view`
- [ ] `make down` roda antes de `git worktree remove`, nunca depois
- [ ] Toda leva do Fluxo 4 tem N ≤ 4 — pedido maior é recusado, nunca truncado
- [ ] As N portas da leva são alocadas de uma vez, antes de disparar qualquer subagente
- [ ] Todo subagente do Fluxo 4 usa `subagent_type: "general-purpose"`, nunca `fork`
- [ ] Nenhum subagente do Fluxo 4 espera notificação de monitor próprio para `make check`/e2e — sempre foreground, e nenhum invoca a `check-dispatcher` para não multiplicar o fan-out
