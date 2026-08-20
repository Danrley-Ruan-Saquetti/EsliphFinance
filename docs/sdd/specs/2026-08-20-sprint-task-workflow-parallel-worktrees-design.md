# Sprint Task Workflow — Paralelização multi-worktree (Fluxo 4)

**Contexto:** `.claude/skills/sprint-task-workflow/SKILL.md` já cobre o ciclo de **uma** task de sprint por vez — Fluxo 1 (início), Fluxo 2 (PR automático) e Fluxo 3 (encerramento) — e registra em "Casos de borda" um aviso contra paralelizar tasks sequenciais/da mesma entidade, por causa de e2e com `RESTART IDENTITY CASCADE` colidindo entre stacks. Essa spec desenha um **Fluxo 4**, extensão da mesma skill, para rodar N tasks independentes em paralelo, cada uma no seu worktree e stack isolados.

**Achado que habilita este fluxo:** o aviso contra paralelizar hoje é sobre worktree **sem** `.env` próprio, que cai de volta no banco da raiz (`server/CLAUDE.md`, `docker-compose.yml`). Quando `STACK_SUFFIX` + `POSTGRES_PORT` são definidos por worktree — o que o Fluxo 1, Passo 4 já faz —, cada worktree ganha container, volume e rede **totalmente isolados** no Compose (`name: esliph-finance${STACK_SUFFIX:-}`). Não há colisão de dados entre worktrees corretamente configurados; o que faltava era o fluxo que orquestra N dessas alocações de uma vez.

## Objetivo

Permitir "paraleliza SCRUM-60, SCRUM-64 e SCRUM-70" (ou variante equivalente): a skill cria N worktrees + N stacks isolados, dispara N subagentes autônomos que implementam cada task de ponta a ponta (jira-ticket-context → tech-lead → code-reviewer → PR), e reporta cada uma assim que termina — sem esperar as demais.

## Escopo

Mesmo escopo da skill-base: só `server/`. Não decide regra de negócio nem implementa código diretamente — isso continua sendo `business-analyst`/`domain-architect`/`platform-architect` e a `tech-lead`, agora rodando dentro de cada subagente. Não introduz um fluxo de encerramento em lote: cada task encerra individualmente pelo Fluxo 3 já existente.

## Decisões já fechadas

| Decisão | Escolha |
| --- | --- |
| Orquestração | Subagentes autônomos (`Agent` tool), um por task — cada um roda o ciclo completo dentro do próprio worktree, igual a uma sessão solo faria hoje no Fluxo 1→tech-lead→Fluxo 2 |
| Entrada | Só lista explícita de números de ticket — nunca infere do backlog |
| Teto de paralelismo | 4 tasks simultâneas — mesmo intervalo de porta (5441–5444) já usado como referência; pedido de N>4 é recusado com aviso, não truncado |
| Checagem de domínio sobreposto | Avisa se duas tasks da leva caírem no mesmo contexto de `docs/domains/` e confirma pontualmente antes de seguir com aquele par — não bloqueia as demais |
| Report | Por task, assim que o subagente correspondente termina — a sessão orquestradora não espera as N |
| Tipo de subagente | `Agent` com `subagent_type: "general-purpose"` (acesso a todas as ferramentas — precisa de `Skill`, `Bash`, `Edit` para rodar `tech-lead` e tudo que ela aciona) — nunca `fork`, porque cada task precisa de contexto próprio e independente, não do histórico da conversa que disparou a leva |
| Execução de `make check`/e2e dentro do subagente | Sempre em **foreground**, nunca aguardando notificação do próprio monitor do subagente — lição já registrada em memória de uma sessão que travou fazendo isso |

## Fluxo 4 — Paralelização multi-worktree

Gatilho: lista explícita de tickets — "paraleliza SCRUM-60, SCRUM-64 e SCRUM-70", "roda essas N tasks em paralelo", "começa essas 3 ao mesmo tempo".

### Passo 1 — Resolver e validar a leva

Parse dos N números citados. Se N > 4, recusa com aviso — não segue com uma subleva silenciosa.

Para cada ticket, `mcp__atlassian__getJiraIssue` (status): precisa ser `"To Do"`. Um ticket que já estiver `"In Progress"` ou `"In Review"` sai da leva com aviso — mesma regra do Fluxo 1, Passo 2, de não criar um segundo worktree para uma task já em andamento — mas não aborta a leva inteira: as demais seguem.

### Passo 2 — Ler as N issues

Antes de criar qualquer worktree, a orquestradora invoca a skill `jira-ticket-context` (via `Skill`) para cada ticket restante da leva, sequencialmente — são só chamadas MCP de leitura. Cada resultado dá o slug do branch (do `summary`) e o cruzamento de RNs/critérios de aceite com `docs/requirements.md`, exatamente como o Fluxo 1, Passo 2 de hoje faz para uma task.

Usa esse mesmo resultado para a checagem de domínio: se duas ou mais tasks da leva caírem no mesmo contexto de `docs/domains/` (inferido do `summary`/descrição da issue), avisa a colisão e pede confirmação pontual antes de seguir com aquele par especificamente — as tasks sem colisão não esperam por essa confirmação.

### Passo 3 — Alocar as N portas de uma vez

Calcula, na própria sessão orquestradora, as N menores portas livres a partir de 5441 entre os worktrees **vivos** (`git worktree list --porcelain`, mesma consulta do Fluxo 1, Passo 4) — tudo **antes** de disparar qualquer subagente, para não ter dois subagentes lendo o mesmo estado em paralelo e reservando a mesma porta.

Cria os N `git worktree add` sequencialmente (rápido, não precisa paralelizar essa parte) e escreve o `server/.env` de cada um com `STACK_SUFFIX`/`POSTGRES_PORT` já reservados — mesmo formato do Fluxo 1, Passo 4.

### Passo 4 — Jira: To Do → In Progress

Para as N tasks restantes da leva, sequencial, mesma resolução de `id` pelo `to.name` do Fluxo 1, Passo 6.

### Passo 5 — Subir os N stacks

Via `stack-runner`, um `make -C <worktree>/server deps && up && db-migrate` por worktree, disparado **em paralelo** (uma chamada `Bash` por worktree na mesma mensagem) — cada stack usa porta, `STACK_SUFFIX` e volume próprios, então não há disputa de recurso entre eles, e paralelizar evita que a criação da leva escale linearmente com N.

### Passo 6 — Disparar os N subagentes em uma única mensagem paralela

Uma chamada `Agent` por task, todas na mesma mensagem (paralelas de fato, não sequenciais). Cada prompt é autocontido e inclui:

- Caminho do worktree e nome do branch já criados no Passo 3.
- Porta alocada.
- O resumo de RNs/critérios de aceite que a `jira-ticket-context` já trouxe no Passo 2 — o subagente **não** reinvoca `jira-ticket-context`, parte direto do roteiro da `tech-lead` a partir de onde ela normalmente entra.
- Instrução explícita de rodar `make check`/`make test-e2e` em **foreground** dentro do próprio subagente, nunca aguardando notificação de um monitor próprio.
- Instrução de, ao fechar limpo (checklist "O fechamento" da `tech-lead`), executar o Fluxo 2 já existente por conta própria: push, `gh pr create`, transição Jira In Progress → In Review, comentário com o link do PR.
- Instrução de, se travar em algo que precise de decisão humana (critério sem RN correspondente, ambiguidade de regra), escalar como a `tech-lead`/`business-analyst` já fariam numa sessão solo, e reportar o bloqueio como resultado — não travar silenciosamente.

### Passo 7 — Reportar conforme cada subagente termina

A sessão orquestradora não aguarda as N tasks para reportar; cada notificação de subagente concluído (sucesso com link do PR, ou bloqueio) é repassada ao usuário assim que chega.

## Casos de borda

- **N > 4**: recusa, não trunca silenciosamente a leva para os 4 primeiros.
- **Ticket já em progresso dentro da leva**: sai da leva com aviso, as demais seguem.
- **Domínio sobreposto entre duas tasks da leva**: avisa + confirma pontualmente, não aborta as tasks sem colisão.
- **Porta ou branch já em uso por um worktree vivo fora dessa leva** (ex.: mesma SCRUM sendo trabalhada em outra sessão): mesmo tratamento do Fluxo 1 hoje — pula essa task específica com aviso, sem abortar a leva.
- **Um subagente trava/bloqueia**: os demais seguem independentes; o bloqueio é reportado como resultado daquela task, não propagado às outras.

## Fora de escopo

- `mobile/` — fora, como no resto da skill.
- Encerramento em lote de várias tasks de uma vez — cada uma encerra individualmente pelo Fluxo 3 já existente, sem mudança nele.
- Merge de PR — sempre humano, sem mudança.
- Qualquer paralelismo dentro de uma única task (isso continua sendo assunto da `tech-lead`).

## Impacto no restante da skill

- Frontmatter `description` do `SKILL.md` ganha os gatilhos deste fluxo ("paraleliza SCRUM-60, SCRUM-64...", "roda essas tasks em paralelo").
- "Casos de borda" da seção geral (hoje: "Duas tasks 'ao mesmo tempo': a skill não impede, mas repete o aviso...") passa a referenciar o Fluxo 4 como o caminho suportado para paralelismo real, mantendo o aviso original para quem tentar paralelizar **fora** deste fluxo (sem `STACK_SUFFIX`/porta isolados).
- Memória do usuário `worktree-stack-ports` (fora deste repositório) fica desatualizada após a implementação — deve ser revisada para refletir que paralelismo passa a ser suportado via Fluxo 4 quando as tasks são independentes/domínios distintos, mantendo "empilhar" como orientação só para tasks sequenciais/mesma entidade.
