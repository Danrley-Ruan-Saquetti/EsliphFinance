---
name: check-dispatcher
description: Use quando o pedido for rodar o gate completo do backend (typecheck, lint, testes unitários e testes e2e) e o tempo total importar — paraleliza os grupos do `make check` em subagentes independentes em vez da cadeia serial que a `stack-runner` roda. Vale para "paraleliza o check", "roda typecheck, test e e2e ao mesmo tempo", "acelera o check", "dispara o check em subagentes", e no fechamento de uma task, quando o usuário preferir isso à execução serial. Não roda comando nenhum sozinha: cada subagente ainda invoca `make -C server <alvo>` pela convenção da `stack-runner`.
---

# Check Dispatcher — EsliphFinance

## Overview

`make -C server check` já existe e faz o trabalho certo: `typecheck lint test test-e2e`, em ordem, parando no primeiro que falhar (`server/Makefile:148`). O custo é que roda tudo em série num único processo — o e2e sozinho é o mais lento do grupo, e ele só começa depois que os outros três terminaram.

Esta skill não substitui esse alvo nem a `stack-runner` que o executa — ela decide **agrupar e paralelizar** a mesma checagem em três subagentes independentes, e agrega o resultado no fim. Você troca o fail-fast do `make` (para no primeiro erro) por tempo de parede menor (o grupo mais lento passa a determinar a duração total, não a soma de todos).

## Quando usar / quando não usar

- **Usar**: gate de fechamento de uma task, PR prestes a abrir, ou qualquer momento em que "roda o check" for pedido e minutos importam.
- **Não usar** para uma alteração de um arquivo isolado onde o `make -C server check` serial já responde em segundos — o overhead de subir três `docker compose run` além do normal não compensa.
- **Escopo é um worktree só**: esta skill paraleliza **os passos do check dentro de um único worktree/stack** — os três subagentes apontam para o mesmo `docker-compose.yml`, a mesma rede, o mesmo banco. Ela não paraleliza tasks inteiras em worktrees separados.
- **Cuidado com fan-out**: se cada subagente que já roda em paralelo também disparar esta skill, N tasks paralelas viram 3N subagentes de uma vez. Nesse cenário, prefira `make -C server check` serial dentro de cada subagente.

## Os três grupos e por que são seguros em paralelo

| Grupo | Alvos | Toca o Postgres real? |
| ----- | ----- | ---------------------- |
| A | `typecheck` → `lint` (nessa ordem, dentro do mesmo subagente) | Não |
| B | `test` (unitários) | Não — usa repositórios in-memory (`server/CLAUDE.md`, seção Testes) |
| C | `test-e2e` | Sim — bate no serviço `database` com as migrations aplicadas |

Só o grupo C escreve no banco. Os grupos A e B não competem por estado nenhum entre si nem com o C, então os três podem rodar ao mesmo tempo sem risco de um `RESTART IDENTITY CASCADE` do e2e (`server/CLAUDE.md`) corromper dado que outro grupo esperava ler. `docker compose run --rm` sobe um container efêmero por invocação e nenhum serviço fixa `container_name`, então as três execuções simultâneas não colidem em nome de container nem em porta — nenhum alvo desses publica porta (só `db-studio` publica).

Grupo A roda `typecheck` antes de `lint` **dentro do mesmo subagente**, não em paralelo entre si: replica o fail-fast que o `make check` original já tinha entre esses dois, e evita gastar tempo com lint quando o tipo já está quebrado.

## Pré-requisito único: migrations em dia

Antes de disparar, rode **uma vez, você mesmo, fora dos subagentes**:

```sh
make -C server db-migrate
```

Isso evita duas coisas: o grupo C falhar em "tabela inexistente" (a armadilha já documentada na `stack-runner`) e uma corrida entre subagentes se a migration fosse responsabilidade de cada um. `db-migrate` é idempotente — só aplica o que estiver pendente.

## Como disparar

Use a ferramenta `Agent`, tipo `general-purpose` (ou omitido), em **um único bloco de mensagem com as três chamadas** — cada subagente começa sem contexto nenhum, então o prompt precisa ser autocontido. Não use `fork`: o trabalho é mecânico e não precisa da conversa atual.

Prompt de cada subagente — adapte o alvo, mantenha o restante:

```
Você vai rodar UM comando make no server/ deste repositório EsliphFinance e reportar o resultado bruto. Não corrija nada, não interprete além do que a saída disser.

A partir da raiz do repositório:
  make -C server typecheck
Se e somente se esse comando passar (exit 0), rode em seguida:
  make -C server lint

Rode cada comando em foreground pelo Bash tool e espere ele terminar sozinho —
NUNCA use Monitor, ScheduleWakeup ou qualquer espera de notificação de um
processo em background que você mesmo iniciou. `make typecheck` e `make lint`
terminam por conta própria; não há nada para monitorar.

Reporte: qual comando rodou, se passou ou falhou, e a saída relevante
(as primeiras e últimas linhas de erro, se houver). Se `typecheck` falhar,
diga isso e não rode `lint`.
```

```
Você vai rodar `make -C server test` neste repositório EsliphFinance e reportar o resultado bruto.

Rode em foreground pelo Bash tool e espere terminar sozinho — NUNCA use Monitor,
ScheduleWakeup ou espere notificação de um monitor próprio; o comando termina
sozinho.

Atenção a uma armadilha conhecida: a cobertura está habilitada por padrão
(threshold 85% em linhas/funções/branches/statements). Leia o fim da saída
antes de reportar teste quebrado — "ERROR: Coverage for lines does not meet
threshold" é falta de cobertura, não teste vermelho. Diga explicitamente qual
dos dois aconteceu, se algum.

Reporte: passou ou falhou, quantos testes rodaram, e a saída relevante.
```

```
Você vai rodar `make -C server test-e2e` neste repositório EsliphFinance e
reportar o resultado bruto. As migrations já foram aplicadas antes de você
começar — não rode `make -C server db-migrate` você mesmo.

Rode em foreground pelo Bash tool e espere terminar sozinho — NUNCA use Monitor,
ScheduleWakeup ou espere notificação de um monitor próprio; o comando termina
sozinho, mesmo levando alguns minutos.

Reporte: passou ou falhou, quantos testes rodaram, e a saída relevante
(mensagem de erro completa de qualquer teste que falhou).
```

## Agregação do resultado

Depois que os três terminarem, reporte por grupo — não resuma como "passou" se qualquer um falhou. Formato:

```
A (typecheck+lint): OK | FALHOU — <resumo>
B (test):            OK | FALHOU — <resumo, teste quebrado vs. cobertura>
C (test-e2e):         OK | FALHOU — <resumo>
```

Se todos os três passaram, o `check` paralelo equivale ao `make -C server check` serial — trate como o mesmo sinal verde esperado no fechamento de uma task. Se algum falhou, a saída bruta é entregue ao dono do arquivo (`spec-writer` ou `clean-code`), do mesmo jeito que a `stack-runner` faz — esta skill também não corrige código.

## Fronteiras

- Não roda `make` diretamente: delega a cada subagente, que segue a convenção da `stack-runner` (`make -C server <alvo>`, nunca `npm`/`npx` no host).
- Não decide conteúdo de código nem regra de negócio.
- Não é a paralelização de tasks inteiras — não cria worktree, não sobe stack próprio, não mexe em porta.
- Não pula o `db-migrate` prévio nem delega isso a um subagente.

## Checklist

- [ ] `make -C server db-migrate` rodou uma vez, antes do dispatch, fora dos subagentes.
- [ ] Os três `Agent` foram disparados no mesmo bloco de mensagem (paralelo de verdade, não sequencial).
- [ ] Cada prompt de subagente é autocontido e proíbe explicitamente Monitor/ScheduleWakeup à espera do próprio `make`.
- [ ] O grupo A rodou `typecheck` antes de `lint`, pulando `lint` se `typecheck` falhou.
- [ ] O grupo B distinguiu teste quebrado de falha de cobertura.
- [ ] O resultado foi agregado por grupo, com a saída real — nenhuma falha foi suavizada.
