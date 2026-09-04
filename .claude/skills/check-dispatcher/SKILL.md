---
name: check-dispatcher
description: Use quando o pedido for rodar o gate completo do backend (typecheck, lint, testes unitários e testes e2e) e o tempo total importar — troca a cadeia serial do gate por três subagentes independentes e agrega o resultado. Vale para "paraleliza o check", "roda typecheck, test e e2e ao mesmo tempo", "acelera o check", "dispara o check em subagentes", e no fechamento de uma task, quando o usuário preferir isso à execução serial. Não roda comando nenhum sozinha e não conhece a linha de comando: ela decide o agrupamento, a ordem dentro de cada grupo e o que precisa acontecer antes do dispatch — cada subagente resolve a forma de invocar pela convenção de execução do repositório.
---

# Check Dispatcher — EsliphFinance

## Overview

O gate de fechamento deste backend já existe como um passo só: checagem de tipos, lint, testes unitários e testes e2e, nessa ordem, parando no primeiro que falhar. É o comportamento certo e é o que o CI cobra. O custo é que roda tudo em série num único processo — o e2e é o mais lento de todos e só começa depois que os outros três terminaram.

Esta skill não substitui esse gate: ela decide **agrupar e paralelizar** a mesma checagem em três subagentes independentes e agregar o resultado no fim. Você troca o fail-fast (para no primeiro erro) por tempo de parede menor — o grupo mais lento passa a determinar a duração total, em vez da soma de todos.

## Fronteira

**Território** — decide **como o gate é fatiado para rodar em paralelo**: quais passos vão juntos, em que ordem dentro de cada grupo, o que precisa estar pronto antes do dispatch, e quando o paralelismo não compensa. Arbitra a política de fan-out, que é a decisão que impede N tasks paralelas de virarem 3N subagentes.

**Fora da fronteira** — a forma de invocar cada passo nesta máquina, que é convenção de execução do repositório e não sua; o conteúdo do código e o significado de uma falha para o produto; e a paralelização de tasks inteiras, que é outro problema com outras armadilhas (worktree, porta, stack própria).

**O que não preciso saber** — o nome do alvo, a linha de comando, o motor de teste, o limiar de cobertura configurado. Nada disso muda o agrupamento, e transcrever qualquer um aqui garante uma segunda cópia para divergir da primeira no dia em que o repositório mudar de ferramenta.

**Contrato de borda** — recebo o pedido de rodar o gate quando o tempo importa. Entrego o resultado agregado por grupo, com a saída real de cada um, e a afirmação explícita de que o conjunto equivale (ou não) ao gate serial.

## Quando usar / quando não usar

- **Usar**: gate de fechamento de uma task, PR prestes a abrir, ou qualquer momento em que "roda o check" for pedido e minutos importam.
- **Não usar** para uma alteração de um arquivo isolado onde o gate serial já responde em segundos — o custo de subir três execuções isoladas em vez de uma não se paga.
- **Escopo é um worktree só**: os três subagentes apontam para a mesma stack, a mesma rede e o mesmo banco. Esta skill paraleliza os **passos do gate**, não tasks.
- **Cuidado com fan-out**: se cada subagente que já roda em paralelo também disparar esta skill, N tasks paralelas viram 3N execuções simultâneas. Nesse cenário, o gate serial dentro de cada subagente é a escolha certa — mais lento por task, e o único que não derruba a máquina.

## Os três grupos e por que são seguros em paralelo

| Grupo | O que roda | Toca o banco real? |
| ----- | ---------- | ------------------ |
| A | Checagem de tipos → lint, nessa ordem, dentro do mesmo subagente | Não |
| B | A suíte unitária | Não — ela é isolada de infraestrutura por desenho |
| C | A suíte e2e | Sim, e ela limpa as tabelas entre os arquivos |

Só o grupo C escreve no banco. A e B não competem por estado nenhum entre si nem com o C, então os três podem rodar ao mesmo tempo sem risco de a limpeza de tabelas do e2e corromper dado que outro grupo esperava ler. As execuções também não colidem entre si por container ou por porta: nenhum desses passos publica porta, e cada invocação sobe um ambiente efêmero próprio. **Confirme isso** na configuração da stack antes de assumir — é o pressuposto que sustenta a skill inteira, e é o primeiro a quebrar se alguém fixar um nome de container ou publicar uma porta.

O grupo A roda a checagem de tipos antes do lint **dentro do mesmo subagente**, e não em paralelo consigo mesmo: replica o fail-fast que o gate serial já tinha entre esses dois e evita gastar tempo com lint quando o tipo já está quebrado.

## Pré-requisito único: o banco pronto antes do dispatch

Antes de disparar, **aplique as migrations pendentes uma vez, você mesmo, fora dos subagentes.**

Isso evita duas coisas: o grupo C falhar em tabela inexistente — uma falha cuja mensagem não diz que a causa é essa — e uma corrida entre subagentes, se aplicar migration fosse responsabilidade de cada um. A aplicação de migrations é idempotente, então rodá-la aqui não custa nada quando não há nada pendente.

## Como disparar

Use a ferramenta `Agent`, tipo `general-purpose` (ou omitido), em **um único bloco de mensagem com as três chamadas** — se forem em blocos separados, viram sequenciais e a skill não fez nada. Não use `fork`: o trabalho é mecânico e não precisa da conversa atual.

Cada subagente começa sem contexto nenhum, então o prompt precisa ser autocontido. Ele declara **a intenção**, não a linha de comando: a forma canônica de executar qualquer coisa neste repositório está indexada no `server/CLAUDE.md`, e é lá que o subagente confere — assim o dispatch continua correto quando o alvo mudar de nome.

Todo prompt carrega três instruções fixas, e cada uma existe por um motivo que já custou tempo:

- **Rode em foreground e espere terminar sozinho.** Nunca use Monitor, ScheduleWakeup ou qualquer espera por notificação de um processo que você mesmo iniciou — esses passos terminam por conta própria, e montar um monitor para eles trava o subagente esperando um evento que não vem.
- **Não corrija nada e não interprete além do que a saída disser.** O subagente é um executor; concluir demais sobre uma falha alheia é como um relatório errado nasce.
- **Reporte a saída relevante como ela é**: o que rodou, se passou ou falhou, e o trecho de erro — sem suavizar.

E o que muda entre eles:

- **Grupo A** — a checagem de tipos e, **se e somente se ela passar**, o lint. Se a primeira falhar, diga isso e não rode a segunda.
- **Grupo B** — a suíte unitária. Instrua explicitamente a **distinguir teste quebrado de reprovação por cobertura**: esta suíte pode reprovar sem nenhum teste vermelho, e um relatório que confunde os dois manda alguém caçar um bug que não existe. O subagente precisa dizer qual dos dois aconteceu.
- **Grupo C** — a suíte e2e. Avise que **as migrations já foram aplicadas** antes de ele começar, para que não as aplique de novo, e que este é o passo longo: alguns minutos são o esperado, não um travamento.

## Agregação do resultado

Depois que os três terminarem, reporte por grupo. **Não resuma como "passou" se qualquer um falhou** — o valor de paralelizar some no instante em que a agregação esconde uma falha.

```
A (tipos + lint):  OK | FALHOU — <resumo>
B (unitários):     OK | FALHOU — <resumo, teste quebrado vs. cobertura>
C (e2e):           OK | FALHOU — <resumo>
```

Se os três passaram, o resultado equivale ao gate serial — trate-o como o mesmo sinal verde esperado no fechamento de uma task. Se algum falhou, a saída bruta é entregue a quem responde pelo conteúdo do arquivo: esta skill decide como o gate roda, e não o que fazer com o que ele encontrou.

## Disciplina do dispatch

- Não execute os passos você mesmo: o trabalho é delegar e agregar, e um passo rodado aqui é um passo fora do paralelismo.
- Não decida conteúdo de código nem regra de negócio.
- Não trate isto como paralelização de tasks — nada de criar worktree, subir stack própria ou mexer em porta.
- Não pule o preparo do banco antes do dispatch, nem o delegue a um subagente.

## Checklist

- [ ] As migrations pendentes foram aplicadas uma vez, antes do dispatch, fora dos subagentes.
- [ ] Os três `Agent` foram disparados no mesmo bloco de mensagem — paralelo de verdade, não sequencial.
- [ ] Cada prompt é autocontido, declara a intenção em vez da linha de comando, e proíbe explicitamente esperar por notificação de um processo próprio.
- [ ] O grupo A rodou a checagem de tipos antes do lint, e pulou o lint quando ela falhou.
- [ ] O grupo B distinguiu teste quebrado de reprovação por cobertura.
- [ ] O resultado foi agregado por grupo, com a saída real — nenhuma falha foi suavizada nem escondida atrás de um verde agregado.
