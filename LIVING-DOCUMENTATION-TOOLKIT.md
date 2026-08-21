# Toolkit de documentação viva — especificação

Especificação genérica das skills, agents, hooks, comandos e checks de CI necessários para **montar** e **manter** o subconjunto de artefatos de documentação viva descrito em `LIVING-DOCUMENTATION.md`. Não é específica de nenhum repositório: a única coisa que muda de projeto para projeto é o mapa de propriedade (`SK-0`, `docs/.ownership.yml`) e os caminhos declarados nele.

Cada peça desta spec tem ID estável e citável — `SK-n` (skill), `AG-n` (agent), `HK-n` (hook), `CI-n` (check de CI), `CM-n` (comando). O toolkit obedece a própria regra que impõe.

## Escopo

**Dentro** — os artefatos destacados como prioritários:

| Camada | Artefatos | Dono |
| --- | --- | --- |
| 1 — Intenção | Constitution, Product Vision | `SK-1` |
| 1 — Intenção | Glossary / ubiquitous language | `SK-2` |
| 2 — Decisões | ADR, Open Decisions, Debt Register (TDR) | `SK-3` |
| 3 — Especificação | Requirements com IDs estáveis | `SK-4` |
| 5 — Contratos | OpenAPI (gerado), Error catalog, política de versionamento | `SK-5` |
| 7 — Como se trabalha | CONTRIBUTING, Definition of Done, contrato do agente | `SK-6` |
| 8 — Rastro histórico | CHANGELOG, release notes, migration guides, depreciações | `SK-7` |
| — | Os seis mecanismos que fazem a documentação ser viva | codificados em `HK-*` e `CI-*` |

**Fora** — deliberadamente não coberto: C4/ERD/threat model (camada 4), runbooks/SLO/postmortems (camada 6), event catalog, RFC longo, feature specs por feature. O toolkit é extensível a eles pelo mesmo mecanismo (`docs/.ownership.yml` + uma skill dona), mas nada aqui os pressupõe.

**Não é objetivo**: gerar volume documental, criar documento que narre código, medir "cobertura documental", nem substituir julgamento humano na aceitação de decisão (ver `HK-3`).

---

## 1. Princípio de alocação: skill, agent, hook, comando ou CI

A decisão errada aqui é a causa de toolkit que ninguém usa. A regra:

| A regra é… | Peça | Por quê |
| --- | --- | --- |
| **Semântica** — "isso merece um ADR?", "esse termo já existe com outro nome?", "essa regra cobre o caso?" | **Skill** | Exige leitura e julgamento; determinismo é impossível |
| **Semântica, mas contaminada por quem escreveu** — "o que este diff deveria ter atualizado e não atualizou?" | **Agent** (contexto isolado) | Quem produziu o código revisa com o mesmo raciocínio que o gerou |
| **Sintática / estrutural** — campo faltando, ID duplicado, caminho proibido, arquivo congelado | **Hook** | Barato, determinístico, não negociável, e acontece no momento do erro |
| **Ponto de entrada humano** — "abre um ADR", "registra essa dívida" | **Comando** | Atalho para a skill; não contém lógica própria |
| **Precisa valer sem agente presente** | **CI** | O único enforcement que sobrevive a alguém editando pelo navegador |

Corolários:

1. **Hook nunca julga.** Se o hook precisa decidir se uma decisão é "custosa de reverter", está no lugar errado — vira `additionalContext` sugerindo a skill, nunca `deny`.
2. **Skill nunca duplica o artefato.** A skill contém o procedimento e as fronteiras; o conteúdo mora no documento. Skill que repete a regra é uma segunda fonte de verdade e viola o mecanismo 6.
3. **Um artefato, um dono.** Dois donos para o mesmo arquivo é divergência garantida. Se dois papéis precisam escrever no mesmo arquivo, o arquivo está errado — quebre-o.
4. **Todo check de CI espelha uma regra escrita numa skill.** Check sem regra documentada é burocracia; regra sem check é promessa.

---

## 2. O contrato de máquina: frontmatter padronizado

É a peça central. Sem ela, nenhum hook e nenhum check é genérico — cada um viraria um parser ad hoc. Todo artefato de documentação viva abre com:

```yaml
---
id: ADR-0042                    # estável, citável, nunca reciclado
title: Fila de eventos em vez de chamada síncrona
status: accepted                # ver a máquina de estados (§4)
owner: "@team-platform"         # pessoa ou time; espelha o CODEOWNERS
trigger: >                      # QUANDO atualizar — condição observável
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-08-21       # data ISO; alimenta CI-4
relates-to: [RN-014, DA-0007]   # rastreabilidade bidirecional
supersedes: ADR-0031
superseded-by: null
---
```

Os seis mecanismos de "o que faz a documentação ser viva" ficam todos codificados nesse bloco:

| Mecanismo | Campo / peça que o materializa | Enforcement |
| --- | --- | --- |
| 1 — Docs-as-code, no mesmo PR | `docs/.ownership.yml` mapeia caminho de código → doc dono | `HK-4`, `HK-5`, `CI-7` |
| 2 — Gatilho, não cadência | `trigger:` — texto livre, mas com vocabulário de cadência proibido | `CI-1` |
| 3 — Rastreabilidade por ID | `id:`, `relates-to:` e a sintaxe de citação (§8) | `CI-2`, `CI-3` |
| 4 — Automação no CI | `last-reviewed:` + os checks | `CI-1`…`CI-8` |
| 5 — Ciclo de vida em vez de deleção | `status:`, `supersedes:`, `superseded-by:` | `HK-1`, `CI-3` |
| 6 — Fonte única com dono | `owner:` + a regra "um artefato, um dono" | `CI-7` |

Regras do frontmatter:

- **`trigger` é obrigatório e é rejeitado se descrever cadência.** `CI-1` reprova `trimestral`, `mensal`, `anualmente`, `periodicamente`, `revisar a cada`, `quarterly`, `sprint`. Um gatilho válido nomeia um evento: "no mesmo PR que altera `src/domain/billing`", "quando um código de erro novo é adicionado", "quando um agente errar por falta de contexto".
- **`id` nunca é reciclado.** IDs retirados vão para `docs/ids-retired.txt` e `CI-2` falha se um deles reaparecer.
- **`last-reviewed` só é tocado por quem realmente reviu.** Um bump automático em massa transforma o campo em ruído e desliga o mecanismo 4.
- Artefatos gerados (`*.gen.*`) **não** têm frontmatter editável — têm o marcador `<!-- generated: do not edit -->` e são território do `HK-2`.

---

## 3. Layout e granularidade

```
docs/
  .ownership.yml            # o único arquivo específico do projeto
  ids-retired.txt
  charter/
    constitution.md         # SK-1
    vision.md               # SK-1
  glossary.md               # SK-2
  decisions/
    adr/ADR-0001-<slug>.md  # SK-3, um por arquivo, append-only
    open-decisions.md       # SK-3, arquivo único, mutável
    debt/TDR-0001-<slug>.md # SK-3, um por arquivo
  requirements/             # SK-4 — um arquivo único ou um por contexto
  contracts/
    openapi.gen.yaml        # SK-5, GERADO
    errors.md               # SK-5, escrito
    versioning-policy.md    # SK-5, escrito
  definition-of-done.md     # SK-6
  deprecations.md           # SK-7
  migrations/               # SK-7
  releases/                 # SK-7
CONTRIBUTING.md             # SK-6
CHANGELOG.md                # SK-7
AGENTS.md / CLAUDE.md       # SK-6 — índice e política, nunca conteúdo
```

**Regra de granularidade** (um arquivo por item vs. arquivo único):

| Natureza do item | Forma | Exemplos |
| --- | --- | --- |
| Append-only, imutável depois de aceito, com corpo longo | **Um arquivo por item**, numerado | ADR, TDR, release note |
| Mutável, curto, lido como lista/tabela | **Arquivo único** com tabela | Open Decisions, Glossary, Error catalog, depreciações |
| Corpo longo mas vivo, com seções estáveis | **Arquivo único**, seções com ID | Constitution, Requirements |

O critério não é gosto: um item imutável em arquivo próprio dá diff limpo e histórico legível; um item mutável em arquivo próprio produz centenas de arquivos que ninguém varre — e "se ninguém lê, não está vivo".

### `docs/.ownership.yml` — o ponto de extensão único

É o que torna o toolkit genérico. Hooks e checks não conhecem caminho nenhum: leem daqui.

```yaml
version: 1
stale-after-months: 6

artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team-platform"
    skill: decision-recorder
    append-only: true                 # HK-1
    mutable-fields: [status, superseded-by, last-reviewed]
  - id-prefix: DA
    path: docs/open-decisions.md
    owner: "@product"
    skill: decision-recorder
  - id-prefix: RN
    path: docs/requirements/
    owner: "@product"
    skill: requirements-keeper
    cited-by: ["test/**", "src/**"]   # CI-3

generated:
  - path: docs/contracts/openapi.gen.yaml   # HK-2
    command: <comando do gerador>            # CI-5

watches:                                     # mecanismo 1: código → doc dono
  - code: "src/domain/**"
    doc: "docs/requirements/"
    reason: "comportamento novo exige regra com ID antes do código"
  - code: "src/**/*.controller.*"
    doc: "docs/contracts/"
  - code: "src/**/errors/**"
    doc: "docs/contracts/errors.md"
  - code: "src/**"
    doc: "CHANGELOG.md"
    consumer-visible: true                   # CI-6

consumer-visible-paths: ["src/api/**", "src/public/**"]
```

---

## 4. Ciclo de vida (mecanismo 5)

Deletar apaga o "por quê"; marcar preserva. Estados válidos por artefato:

| Artefato | Máquina de estados | Quem promove |
| --- | --- | --- |
| ADR | `draft → accepted → superseded` | humano promove para `accepted` (`HK-3`) |
| Constitution / Vision | `draft → accepted` + log de emendas com `version` | humano |
| Open Decision (DA) | `open → resolved(ADR-nnnn)` \| `open → dropped` | humano |
| TDR | `open → paid` \| `accepted-permanently` | humano |
| Requisito (RF/RNF/RN) | `draft → active → revoked(por RN-mmm)` | humano |
| Termo do glossary | `active → renamed(para X)` \| `banned` | agente pode propor, humano aceita |
| Código de erro | `active → deprecated(usar X) → removed(em vN)` | segue a política de versionamento |
| Entrada de CHANGELOG | `Unreleased → <versão>` | release |

**Nenhum estado terminal permite edição do corpo.** Um ADR aceito que se revelou errado não é corrigido: ganha `status: superseded` e `superseded-by`, e a decisão nova explica o erro. A história das decisões é o ativo.

**Nenhum agente promove estado sozinho.** O máximo que uma skill escreve é `draft`/`open`. A promoção é ato humano — `HK-3` intercepta com `permissionDecision: "ask"`.

---

## 5. Skills

Sete skills, uma por dono de artefato, separadas por **taxa de mudança e gatilho** — não por camada. Constitution (emenda deliberada, raríssima) e Glossary (todo termo novo, semanal) são camada 1 mas skills distintas justamente por isso; ADR, Open Decisions e TDR são artefatos distintos mas uma skill só porque são **uma máquina de estados única** (lacuna → decisão → dívida aceita).

Convenções de autoria em §11. Cada skill declara, na mesma ordem: do que é dona, gatilho, procedimento numerado, fronteiras (tabela "é seu / não é seu") e checklist final.

### SK-0 `living-docs-bootstrap` — o setup

| | |
| --- | --- |
| **Dona de** | `docs/.ownership.yml`, a estrutura de diretórios, os templates, a instalação de `HK-*` e `CI-*` |
| **Gatilho** | Uma vez por projeto; de novo a cada mudança de estágio de maturidade (§9) |
| **Fronteira** | Não escreve o conteúdo de nenhum artefato — cria a moldura e o enforcement |

Procedimento:

1. **Inventariar antes de criar.** Varrer o repositório por artefatos que já existem sob outro nome ou caminho (`decisions/`, `adr/`, `rfc/`, `requisitos.md`, `spec/`, wiki exportada). Adotar o que existe registrando-o em `.ownership.yml`; **nunca** criar um paralelo — duplicata é o anti-padrão mais caro da lista.
2. **Determinar o estágio** (solo, time pequeno, produção, múltiplos times) e derivar o conjunto mínimo (§9). Não instalar o que o estágio não pede.
3. **Escrever `docs/.ownership.yml`** com os caminhos reais, os donos reais e os `watches` que refletem a estrutura real do código.
4. **Instalar na ordem das fases** (§9). Frontmatter + `CI-1` primeiro: sem contrato de máquina, nada mais é enforceável.
5. **Registrar no contrato do agente** (`AGENTS.md`/`CLAUDE.md`, via `SK-6`) o índice: qual artefato responde a quê e qual skill é dona. Apenas o índice — nada de conteúdo copiado.
6. **Entregar em um PR só**, com a matriz de gatilhos preenchida e a lista explícita do que ficou fora e por quê.

Idempotência é requisito: rodar duas vezes não duplica arquivo, não reescreve conteúdo existente, não renumera ID.

### SK-1 `charter-keeper` — Constitution + Product Vision

| | |
| --- | --- |
| **Dona de** | `docs/charter/constitution.md`, `docs/charter/vision.md` |
| **Gatilho** | Emenda deliberada da Constitution; mudança de estratégia na Vision. Jamais como efeito colateral de outra tarefa |

Regras:

1. **Todo princípio é testável e tem enforcement nomeado.** O formato é `<princípio> — verificado por <hook \| lint \| teste \| revisão \| check>`. Princípio sem enforcement é slogan: a skill recusa e propõe a versão verificável. "Valores monetários são inteiros na menor unidade" passa; "prezamos por qualidade" não.
2. **Limite de 1–2 páginas.** Estourar é sintoma de princípio que virou requisito — mover para `SK-4`, não expandir a Constitution.
3. **Emenda é append.** Nunca reescrever um princípio no lugar: a seção `## Log de emendas` recebe data, o que mudou, o porquê, e `version` sobe. Um princípio revogado fica com `status: revoked` e a emenda que o revogou.
4. **A Vision responde três coisas** e só: que problema, para quem, qual métrica de sucesso. Se a alteração não muda nenhuma das três, não é mudança de Vision.

| É seu | Não é seu |
| --- | --- |
| O que é inviolável, e como se verifica | Decisão técnica pontual (→ `SK-3`) |
| Métrica de sucesso do produto | Regra de negócio (→ `SK-4`) |
| Rejeitar princípio não testável | Aceitar a emenda — isso é humano |

### SK-2 `glossary-keeper` — ubiquitous language

| | |
| --- | --- |
| **Dona de** | `docs/glossary.md` |
| **Gatilho** | Termo de domínio novo em código, spec ou conversa; termo com dois significados; renomeação de conceito |

Formato de entrada: `Termo \| Definição \| Nome no código \| Não confundir com \| Fonte (RN/ADR)`.

Regras:

1. **Um significado por termo, sem exceção.** Se o negócio usa a mesma palavra para duas coisas, criam-se dois termos e um dos dois é **banido do código** (`status: banned`), com o substituto apontado.
2. **Divergência entre o nome no código e o termo é bug, não sinônimo.** Ao encontrar, a skill propõe o rename no código — não adiciona uma segunda linha no glossary.
3. **Definição sem fonte é rascunho.** Todo termo aponta para a RN/ADR que o define, ou nasce `draft` até que exista uma.
4. A skill é o insumo mais frequente das outras: `SK-4` e `SK-5` nomeiam pelo glossary, não pelo hábito.

### SK-3 `decision-recorder` — ADR + Open Decisions + TDR

A skill mais importante do toolkit. ADR e Open Decisions capturam a única informação que **não** é reconstruível a partir do código: o "por quê" e o "ainda não sabemos".

| | |
| --- | --- |
| **Dona de** | `docs/decisions/adr/`, `docs/open-decisions.md`, `docs/decisions/debt/` |
| **Gatilho** | (a) decisão custosa de reverter; (b) alguém trombou numa lacuna; (c) atalho assumido de propósito |

Os três artefatos são estados de um fluxo:

```
lacuna encontrada ──> DA-nnn (open)
                        │
                        └─ decidido ──> ADR-nnn (draft ──ato humano──> accepted)
                                          │
                                          └─ aceita perda deliberada ──> TDR-nnn
```

Regras:

1. **Nunca invente regra em silêncio.** Ao implementar e encontrar comportamento sem regra escrita: abrir `DA-nnn` e **parar**. A saída da skill é o ID, não o código. Enquanto o item está em Open Decisions, ele não tem regra e não deve ser implementado.
2. **ADR aceito é imutável.** Só `status`, `superseded-by` e `last-reviewed` mudam (`HK-1` reforça a allowlist). Um ADR reescrito retroativamente vale zero.
3. **Formato Nygard/MADR**: Contexto / Decisão / Status / Consequências, com **alternativas consideradas e o que se aceita perder**. ADR sem consequência negativa declarada é propaganda — a skill exige o custo.
4. **A skill não decide.** Ela levanta as alternativas e o trade-off, escreve `draft` e pede a decisão. `accepted` é ato humano.
5. **TDR exige gatilho de pagamento observável** — não uma data vaga. "Quando o volume passar de X" ou "no primeiro PR que tocar este módulo" passam; "quando der tempo" não é gatilho e a skill rejeita. `CI-4` falha em TDR com gatilho vencido.
6. **Numeração sequencial, nunca reciclada** (`docs/ids-retired.txt`).
7. **Toda DA fechada aponta o ADR que a fechou**, e o ADR aponta de volta (`CI-3` verifica os dois lados).

| É seu | Não é seu |
| --- | --- |
| Registrar por que isto e não aquilo, e o que se perde | Tomar a decisão |
| Transformar lacuna em item bloqueante com ID | Implementar a regra que falta |
| Registrar a dívida com gatilho de pagamento | Pagar a dívida |

### SK-4 `requirements-keeper` — requisitos com IDs estáveis

| | |
| --- | --- |
| **Dona de** | `docs/requirements/` — `RF-nnn` (funcionais), `RNF-nnn` (não funcionais), `RN-nnn` (regras de negócio) |
| **Gatilho** | Antes de implementar qualquer comportamento; toda regra nova ou alterada |

Regras:

1. **Não olha o código, e isso é deliberado.** A spec diz o que **deve** ser; justificar uma regra pelo que o código faz hoje inverte a relação e apaga o gap que a camada 4 existe para mostrar.
2. **ID estável, citável e nunca reciclado.** Requisito sem ID não pode ser referenciado por teste, commit ou ADR — e sem isso não há raio de impacto calculável por `grep`.
3. **Regra removida é `revoked`, não deletada**, com o ID do que a substituiu.
4. **"Fora de escopo" é campo de primeira classe** onde houver ambiguidade. É ele que impede o alargamento silencioso.
5. **Requisito ausente → `SK-3`, não invenção.** É a mesma regra vista do outro lado.
6. **Toda RN `active` é citada por ao menos um teste** (`CI-3`). Rastreabilidade bidirecional: o teste cita a regra, e a regra sabe quem a cobre.
7. Termos vêm do glossary (`SK-2`), não do hábito de quem escreve.

### SK-5 `contract-keeper` — OpenAPI + Error catalog

| | |
| --- | --- |
| **Dona de** | a *pipeline* que gera `docs/contracts/openapi.gen.yaml`; e, escritos à mão, `errors.md` e `versioning-policy.md` |
| **Gatilho** | Mudança de interface pública; código de erro novo; mudança de política de versionamento |

Regras:

1. **Se pode ser gerado, não escreva.** A skill nunca edita o arquivo gerado (`HK-2` bloqueia). Para mudar o contrato, muda-se a fonte anotada e roda-se o gerador; `CI-5` regenera e falha se houver diff.
2. **O que se escreve à mão é a política em volta**, não o contrato: versionamento, depreciação, estabilidade.
3. **Error catalog**: código estável e imutável em significado, separado da mensagem exibível. Uma vez publicado, um código nunca muda de sentido — ganha `deprecated` e um substituto. Cada entrada declara: código, significado, quando ocorre, status HTTP/transporte, e se é público.
4. **Código de erro novo em caminho consumidor-visível gera entrada no CHANGELOG** (`SK-7`, `CI-6`).
5. **Depreciação exige substituto**. Sem substituto não é depreciação, é quebra de compatibilidade e passa pela política de versionamento — e por um ADR.

### SK-6 `working-agreements-keeper` — CONTRIBUTING + DoD + contrato do agente

| | |
| --- | --- |
| **Dona de** | `CONTRIBUTING.md`, `docs/definition-of-done.md`, `AGENTS.md`/`CLAUDE.md` |
| **Gatilho** | Mudança de processo; **e toda vez que um agente ou uma pessoa nova erra por falta de contexto** |

Esse segundo gatilho é o melhor que existe no catálogo: torna o documento auto-corretivo. A skill formaliza o loop — erro observado vira uma linha, e a linha tem uma de duas formas: *onde está a verdade* ou *o que nunca fazer*.

Regras:

1. **O contrato do agente é índice e política, não conteúdo.** Toda afirmação factual mora no artefato dono e é linkada. Conteúdo duplicado nele apodrece igual a qualquer outro — e `CI-7` sinaliza quando ele repete texto de um artefato dono.
2. **A DoD é executável e inclui a atualização do doc dono no mesmo PR.** É o mecanismo 1 codificado onde ele é lido: se a atualização da documentação não cabe no PR que mudou o código, ela não acontece.
3. **A DoD é a fonte do `CI-7`**: cada item verificável nela tem um check, ou é explicitamente marcado como verificação humana.
4. Style guide entra aqui **só com o que o linter não pega** (nomenclatura, idioma, granularidade). O resto é configuração de ferramenta, não documento.

| É seu | Não é seu |
| --- | --- |
| Como se trabalha e quando algo está pronto | A regra de negócio que o CONTRIBUTING referencia |
| Transformar erro por falta de contexto em linha nova | Duplicar conteúdo de outro artefato |

### SK-7 `release-historian` — CHANGELOG, releases, depreciações

| | |
| --- | --- |
| **Dona de** | `CHANGELOG.md`, `docs/releases/`, `docs/deprecations.md`, `docs/migrations/` |
| **Gatilho** | Toda mudança visível ao consumidor (no mesmo PR, em `## [Unreleased]`); toda release; toda depreciação |

Regras:

1. **CHANGELOG é voltado ao consumidor — não é `git log`.** Teste único: se a entrada só faz sentido para quem escreveu o código, ela não pertence ao CHANGELOG. Formato Keep a Changelog (`Added`/`Changed`/`Deprecated`/`Removed`/`Fixed`/`Security`), `Unreleased` no topo.
2. **A entrada nasce no PR que causa a mudança**, não na véspera da release. `CI-6` exige a entrada quando o diff toca `consumer-visible-paths`, ou um rótulo explícito de exceção.
3. **Depreciação exige quatro coisas**: data do anúncio, versão/data de remoção, substituto, e link para o guia de migração. Faltando qualquer uma, não vai para o registro.
4. **Release note é derivada do CHANGELOG**, não escrita de novo — e é congelada depois de publicada (`HK-1`).
5. **Migration guide por mudança quebra-compatibilidade**, apontando o ADR que a decidiu.

---

## 6. Agents (contexto isolado)

Dois, e ambos existem pela mesma razão: distância de quem produziu o material.

### AG-1 `docs-divergence-auditor`

Recebe um diff (ou uma lista de caminhos) e responde uma pergunta que nenhuma ferramenta genérica responde: **o que este diff deveria ter atualizado e não atualizou.** Roda isolado porque quem acabou de escrever o código revisa com o mesmo raciocínio que o gerou, e não vê os próprios pontos cegos.

- Tools: leitura + busca + `git`. **Sem `Edit`/`Write`, por design** — aponta e para.
- Insumo obrigatório: `docs/.ownership.yml` (os `watches`) e os artefatos que eles apontam.
- Três classes de achado, e só essas três:
  1. **Doc desatualizado** — o código mudou e o doc dono não (com o caminho, a regra do `watches` e o trecho do doc que ficou falso).
  2. **Doc mentiroso** — o documento afirma um comportamento que o código deixou de ter.
  3. **Comportamento sem regra** — código que decide algo que nenhum requisito cobre. Saída: abrir `DA-nnn` via `SK-3`.
- Cada achado traz arquivo, linha, severidade e o **artefato dono** que deveria mudar. Sem preferência estética, sem auditoria do repositório inteiro fora do escopo recebido.
- Declara o escopo na primeira linha do relatório; se o diff for grande demais para leitura honesta, diz o tamanho e revisa por corte — não amostra fingindo que leu tudo.

### AG-2 `decision-adversary`

Recebe **uma** proposta — ADR `draft`, emenda de Constitution, ou TDR — e tenta refutá-la. Isolado para não herdar o raciocínio de quem propôs.

Checklist adversarial fixo: a alternativa descartada foi realmente avaliada? qual consequência negativa está omitida? esse princípio é testável ou é slogan? esse gatilho de pagamento é observável? existe ADR anterior que isso contradiz sem supersedir? Veredito binário — `pronto para aceitação` ou `o que falta` —, nunca reescrita da proposta.

---

## 7. Hooks

Determinísticos, sem julgamento. Um hook que precisa interpretar intenção está no lugar errado. Contrato: JSON no stdin; resposta em `hookSpecificOutput` com `permissionDecision` (`deny`/`ask`) ou `additionalContext`; toda mensagem de bloqueio nomeia **a regra de origem, o artefato dono e o caminho válido para fazer o que se queria**.

| ID | Evento / matcher | Decisão | O que faz |
| --- | --- | --- | --- |
| `HK-1` | `PreToolUse` / `Edit\|Write` | `deny` | Bloqueia alterar item append-only em estado congelado (ADR `accepted`/`superseded`, release note publicada, TDR `paid`). **Permite** mudança restrita à `mutable-fields` do `.ownership.yml` — é assim que se supersede um ADR sem violar a imutabilidade. |
| `HK-2` | `PreToolUse` / `Edit\|Write` | `deny` | Bloqueia editar artefato gerado (`generated[].path` ou marcador `generated: do not edit`). Aponta a fonte anotada e o comando do gerador. |
| `HK-3` | `PreToolUse` / `Edit\|Write` | `ask` | Intercepta promoção de estado que exige ato humano (`draft → accepted`, `open → resolved`). Nenhum agente aceita uma decisão sozinho. |
| `HK-4` | `PostToolUse` / `Edit\|Write` | `additionalContext` | Editou caminho vigiado em `watches` → injeta o doc dono, o gatilho e a skill responsável. Lembrete, nunca bloqueio. |
| `HK-5` | `PreToolUse` / `Bash` (`git commit`) | `ask` | O staged toca caminho vigiado e o doc dono não está no commit → lista os pendentes e pergunta. É o mecanismo 1 no ponto mais barato possível. |
| `HK-6` | `SessionStart` | `additionalContext` | Injeta o inventário: artefatos presentes e ausentes, DAs abertas, TDRs com gatilho vencido, docs com `last-reviewed` estourado. Resolve "se ninguém lê, não está vivo" na origem. |
| `HK-7` | `PostToolUse` / `Edit\|Write` | `additionalContext` | Marcador de atalho novo (`TODO`, `FIXME`, supressão de tipo/lint, teste ignorado) sem `TDR-` próximo → sugere registrar a dívida. Aviso: um atalho legítimo não pode ser bloqueado. |

Esqueleto de referência (`HK-1`), no runtime que o projeto já usa para hooks:

```python
#!/usr/bin/env python3
"""PreToolUse (Edit|Write): nega alteração de item append-only congelado.

Regra de origem: LIVING-DOCUMENTATION-TOOLKIT.md §4 — "nenhum estado terminal
permite edição do corpo". A allowlist de campos vem de docs/.ownership.yml.
"""
import json, os, re, sys

FROZEN = {"accepted", "superseded", "deprecated", "published", "paid"}

def main() -> int:
    payload = json.load(sys.stdin)
    tool_input = payload.get("tool_input", {})
    path = tool_input.get("file_path", "")
    norm = path.replace("\\", "/")

    rule = match_append_only(norm)          # lê docs/.ownership.yml
    if rule is None or not os.path.isfile(path):
        return 0                            # criar item novo é sempre permitido

    if read_status(path) not in FROZEN:
        return 0

    if touches_only(tool_input, rule["mutable-fields"]):
        return 0                            # supersedir é a mutação legítima

    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": (
            f"Bloqueado: `{os.path.basename(path)}` está em estado congelado. "
            "Um item aceito não se corrige — crie um novo com `supersedes:` e "
            "marque este como `superseded`. Skill dona: decision-recorder."
        ),
    }}))
    return 0

if __name__ == "__main__":
    sys.exit(main())
```

Requisitos não funcionais dos hooks: **timeout curto** (≤5 s), **falha aberta** (erro ao ler configuração retorna 0 e deixa passar — um hook quebrado não pode travar o trabalho), **zero rede**, e mensagem que ensina o caminho certo em vez de só negar.

---

## 8. Rastreabilidade por ID (mecanismo 3)

Sintaxe de citação, uniforme em código, teste, doc e mensagem de commit: `<PREFIXO>-<número>` (`RN-014`, `ADR-0042`, `DA-0007`, `TDR-0003`). Uma única forma, porque é ela que `CI-2` e `CI-3` reconhecem por `grep`.

O grafo que os checks mantêm íntegro:

```
Constitution ──princípio──> ADR ──decide──> RN ──verificada por──> teste
     ^                       │                │
     │                       │                └──> entrada de CHANGELOG (se pública)
   emenda                    v
                            TDR ──gatilho de pagamento──> condição observável
DA ──resolvida por──> ADR
Glossary <──nomeia── RN, contrato, código
Error catalog ──código──> contrato gerado
```

Exigências verificadas:

- Toda citação resolve para um ID existente e não `retired` (`CI-2`).
- Todo par bidirecional fecha nos dois lados: `supersedes`/`superseded-by`, DA `resolved`/ADR, RN `revoked`/RN substituta (`CI-3`).
- Toda RN `active` tem ≥1 citação nos caminhos de `cited-by` (`CI-3`).
- Todo ADR `accepted` cita ≥1 requisito, DA ou princípio — decisão que não se liga a nada é sinal de contexto faltando.

---

## 9. Checks de CI

| ID | Check | Falha quando |
| --- | --- | --- |
| `CI-1` | **Structure lint** | Frontmatter ausente/inválido; `status` fora da máquina de estados; `owner` vazio; `trigger` ausente **ou descrevendo cadência** |
| `CI-2` | **ID lint** | ID duplicado, fora de sequência, ou reaproveitado de `ids-retired.txt`; citação que não resolve |
| `CI-3` | **Traceability** | Par bidirecional aberto; RN `active` sem citação; ADR `accepted` sem `relates-to`; DA `resolved` sem ADR |
| `CI-4` | **Staleness** | `last-reviewed` além de `stale-after-months` (aviso); TDR com gatilho de pagamento vencido (falha) |
| `CI-5` | **Contract drift** | Regenerar o contrato produz diff ≠ 0 |
| `CI-6` | **Changelog required** | Diff toca `consumer-visible-paths` sem entrada em `Unreleased` nem rótulo de exceção |
| `CI-7` | **Ownership coverage** | Artefato sem entrada no CODEOWNERS ou no `.ownership.yml`; caminho de código vigiado sem doc dono; contrato do agente repetindo texto de um artefato dono |
| `CI-8` | **Links** | Link interno quebrado; `[[wikilink]]` sem destino; anexo em formato binário sob `docs/` |

Regras de projeto dos checks: rodam **em minutos, no PR**, e a saída nomeia o arquivo, a linha e a correção. `CI-4` é o único autorizado a apenas avisar — os demais falham, porque aviso ignorado é o começo da wiki morta. Nenhum check mede volume ou "cobertura documental": produz número, não verdade.

---

## 10. Comandos e ordem de implantação

### Comandos (atalhos finos, sem lógica própria)

| ID | Comando | Aciona |
| --- | --- | --- |
| `CM-1` | `/adr [assunto]` | `SK-3` — novo ADR `draft`, ou supersedir um existente |
| `CM-2` | `/open-decision [lacuna]` | `SK-3` — registra `DA-nnn` e **para** a implementação |
| `CM-3` | `/debt [atalho]` | `SK-3` — registra `TDR-nnn` com gatilho de pagamento |
| `CM-4` | `/term [termo]` | `SK-2` |
| `CM-5` | `/docs-audit [escopo]` | `AG-1` |
| `CM-6` | `/docs-setup` | `SK-0` |
| `CM-7` | `/release [versão]` | `SK-7` |

### Fases

A ordem importa mais que o conteúdo: **ADR e Open Decisions antes de tudo** — custam quase nada e capturam a única informação que se perde de verdade. O resto se reconstrói a partir do código; esses dois, não.

| Fase | Entrega | Por que aqui |
| --- | --- | --- |
| **0** | `docs/.ownership.yml`, frontmatter padrão, `CI-1`, `CI-2`, CODEOWNERS | Sem contrato de máquina nada é enforceável |
| **1** | `SK-3`, `HK-1`, `HK-3`, `CM-1`–`CM-3` | O núcleo: "por quê" e "ainda não sabemos" |
| **2** | `SK-4`, `CI-3` | A spec citável, e a rastreabilidade que ela habilita |
| **3** | `SK-6`, DoD, `HK-4`, `HK-5` | Amarra doc ao PR — o mecanismo 1 |
| **4** | `SK-2`, `SK-1`, `AG-2` | Linguagem e intenção, depois que já há decisões para destilar |
| **5** | `SK-5`, `HK-2`, `CI-5` | Contratos gerados; exige pipeline de build madura |
| **6** | `SK-7`, `CI-6`, `HK-7` | Rastro histórico, quando já há consumidor externo |
| **7** | `AG-1`, `HK-6`, `CI-4`, `CI-7`, `CI-8` | Manutenção contínua e detecção de apodrecimento |

Mapeamento por estágio de maturidade — instale só o que o estágio pede:

| Estágio | Fases |
| --- | --- |
| Solo / protótipo | 0, 1 |
| Time pequeno / produto real | + 2, 3, 4 |
| Produção com usuários | + 5, 6 |
| Múltiplos times | + 7 |

---

## 11. Convenções de autoria

### SKILL.md

```markdown
---
name: decision-recorder
description: >
  Use quando ... <gatilho em linguagem de sintoma, não de categoria>
---

# <Nome> — dono de <artefatos>

## Overview                     — o que existe hoje e o que esta skill decide
## Do que você é dono           — tabela artefato → o que é
## Quando usar / quando não     — inclusive o custo de usar à toa
## Procedimento                 — passos numerados, verificáveis
## Fronteiras                   — tabela "é seu / não é seu"
## Checklist                    — caixas marcáveis, uma por invariante
```

A `description` **é o gatilho do documento traduzido para o índice de skills** — a seleção acontece por semelhança com essa frase, então ela precisa conter os sintomas que a pessoa realmente digita ("qual é a regra de X", "isso está documentado?", "por que isso foi feito assim?"), os sinônimos e os termos do domínio. Uma `description` categórica ("gerencia ADRs") não é encontrada quando importa.

A frase do campo `trigger:` no artefato e a `description:` da skill dona **dizem a mesma coisa**. É o que liga o mecanismo 2 ao roteamento: se divergirem, o documento declara um gatilho que nada dispara.

Demais regras: uma skill = um dono; nada de conteúdo do artefato dentro da skill; referências longas em `references/*.md`, carregadas por demanda; toda skill termina em checklist, e todo item do checklist corresponde a uma invariante que `CI-*` verifica ou que só um humano pode verificar (dito explicitamente).

### Idioma e commits

Identificadores, nomes de arquivo, códigos de erro e IDs em inglês/neutro; prosa dos documentos no idioma do projeto. Mensagem de commit que altera artefato cita o ID afetado — é o que torna `git log` navegável por regra.

---

## 12. Critérios de aceite do toolkit

1. **Dado** um repositório sem documentação viva, **quando** `SK-0` roda, **então** existe `.ownership.yml`, a estrutura das fases do estágio, e nenhum artefato preexistente foi duplicado ou sobrescrito.
2. **Dado** um ADR `accepted`, **quando** se tenta alterar o corpo, **então** `HK-1` nega e indica supersedir; **quando** se altera só `status`+`superseded-by`, **então** permite.
3. **Dado** um doc com `trigger: revisar trimestralmente`, **quando** o CI roda, **então** `CI-1` falha nomeando o campo.
4. **Dado** um comportamento sem regra escrita, **quando** um agente vai implementá-lo, **então** o resultado é um `DA-nnn` e a implementação **não** acontece.
5. **Dado** um PR que altera caminho vigiado sem tocar o doc dono, **quando** se tenta commitar, **então** `HK-5` pergunta e lista os pendentes; **e** o CI sinaliza pelo `watches`.
6. **Dado** um contrato gerado, **quando** alguém o edita à mão, **então** `HK-2` nega — e, se passar por fora do agente, `CI-5` falha.
7. **Dado** um TDR com gatilho de pagamento cumprido, **quando** o CI roda, **então** falha até que a dívida seja paga ou o TDR reclassificado.
8. **Dado** o início de uma sessão, **quando** `HK-6` roda, **então** o inventário e as pendências chegam ao contexto sem ninguém precisar procurar.
9. **Dado** um agente que errou por falta de contexto, **quando** `SK-6` age, **então** existe uma linha nova no contrato do agente — e ela é índice ou política, não conteúdo copiado.
10. **Nenhuma** peça do toolkit produz documento que narre código, nem métrica de volume documental.

---

## 13. Anti-requisitos

O toolkit falha se produzir qualquer um destes, e cada peça deve ser recusada quando levar a eles:

- Wiki paralela ao repositório, ou artefato fora do controle de versão.
- Diagrama ou anexo em formato binário sob `docs/` (`CI-8` reprova).
- ADR editado retroativamente, ainda que "só para corrigir".
- Documento que narra o código linha a linha — o código já faz isso melhor.
- `trigger` com cadência de calendário.
- Documento sem dono, ou com dois.
- Requisito, decisão ou dívida sem ID.
- Bump automático em massa de `last-reviewed` — desliga o mecanismo 4 fingindo cumpri-lo.
- Skill que decide e aceita sozinha aquilo que é ato humano (`HK-3` é a rede de segurança, não a política).
- Vinte documentos de quatrocentas linhas: **se ninguém lê, não está vivo.**
