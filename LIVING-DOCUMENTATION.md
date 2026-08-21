# Documentação viva

Catálogo de artefatos de conhecimento que vale montar e manter versionado em um projeto de software — genérico, não específico deste repositório. A última seção aplica o catálogo ao EsliphFinance.

## O princípio organizador

Documentação viva não é "documentação atualizada". É documentação com três propriedades:

1. Mora no mesmo repositório do código.
2. Tem um **gatilho explícito de atualização** — não uma cadência de calendário.
3. Tem dono.

Tudo que não tem gatilho vira wiki morta em três meses.

O segundo eixo é separar artefatos por **taxa de mudança**. Misturar princípios (mudam por ano) com estado do código (muda por PR) no mesmo arquivo é a causa mais comum de documentação apodrecida.

---

## Camada 1 — Intenção

Muda raramente. É o contrato de valores.

| Artefato | Responde | Gatilho de atualização |
| --- | --- | --- |
| **Constitution / Engineering Charter** | O que é inviolável aqui: princípios de design, política de teste, política de segurança, o que nunca fazemos | Só por emenda deliberada, com log de emendas e versão |
| **Product Vision / North Star** | Que problema, para quem, qual métrica de sucesso | Mudança de estratégia |
| **Glossary / Ubiquitous Language** | O que cada termo do domínio significa — um significado só | Toda vez que um termo novo aparece em código ou spec |

A Constitution ganhou tração com *spec-driven development* justamente porque é o documento que agentes de IA leem primeiro. Ela é curta — 1 a 2 páginas — e cada princípio é testável ("valores monetários são inteiros em centavos", não "prezamos por qualidade").

O Glossary é o mais subestimado da lista. É o que faz o nome no código, o nome na spec e o nome na conversa com o negócio serem o mesmo nome.

---

## Camada 2 — Decisões

Append-only, imutáveis.

| Artefato | Responde | Gatilho |
| --- | --- | --- |
| **ADR** (Architecture Decision Record) | Por que isto e não aquilo, e o que aceitamos perder | Toda decisão custosa de reverter |
| **RFC / Design Doc** | A proposta longa, antes da decisão | Antes de uma mudança grande; o ADR é o resumo do resultado |
| **Open Decisions / Decision Backlog** | O que ainda **não** foi decidido | Toda vez que alguém trombou numa lacuna |
| **Debt Register (TDR)** | Que dívida assumimos de propósito, com que gatilho de pagamento | Ao fazer o atalho conscientemente |

A regra de ouro do ADR: **nunca editar um ADR aceito**. Ele ganha status `superseded by ADR-042`. A história das decisões é o ativo; um ADR reescrito retroativamente vale zero. Use MADR ou o formato Nygard (Contexto / Decisão / Status / Consequências), um por arquivo, numerado.

O **Open Decisions** é o artefato que quase ninguém mantém e que mais evita retrabalho — principalmente com agentes. Sem ele, a lacuna vira invenção silenciosa: alguém implementa uma regra que ninguém aprovou. Com ele, a lacuna é um item com ID que bloqueia implementação.

---

## Camada 3 — Especificação

O que o produto **deve** fazer.

| Artefato | Responde | Gatilho |
| --- | --- | --- |
| **Requirements com IDs estáveis** (RF/RNF/RN) | A regra de negócio canônica | Antes de implementar qualquer comportamento |
| **Feature Spec** (por feature) | User stories, critérios de aceite em Given/When/Then, **fora de escopo** | Por feature, antes do plano técnico |
| **Quality Attribute Scenarios / NFR budget** | Latência, disponibilidade, custo — com números | Quando um número muda ou é violado |
| **Domain model / invariantes** | Agregados, o que nunca pode ser verdade | Ao modelar ou remodelar um contexto |

O detalhe que faz diferença são os **IDs estáveis e citáveis**. Um requisito sem ID não pode ser referenciado por um teste, por um commit, por um ADR. Com ID, existe rastreabilidade bidirecional — o teste cita a regra, a regra sabe quais testes a cobrem, e uma mudança tem raio de impacto calculável por `grep`.

O campo **fora de escopo** na spec vale tanto quanto o escopo. É ele que impede o alargamento silencioso.

---

## Camada 4 — Arquitetura

O que **está** construído.

| Artefato | Responde | Gatilho |
| --- | --- | --- |
| **C4 (Contexto / Container / Componente)** | Como o sistema se encaixa, em 3 zooms | Mudança estrutural |
| **Arc42** (ou esqueleto equivalente) | Índice canônico do documento de arquitetura | Serve de moldura, não muda |
| **Context Map / mapa por domínio** | Onde cada regra vive, fronteiras entre contextos, **o que ainda não existe** | No mesmo PR que muda o código do contexto |
| **Data model / ERD + política de migração** | Formato dos dados e como ele evolui | Toda migration |
| **Threat model (STRIDE)** | Superfície de ataque e mitigação | Mudança de superfície: novo endpoint, novo integrador |

Regra dura: **diagrama é código**. Mermaid, PlantUML ou Structurizr DSL versionados em texto. Um `.drawio`, um Figma ou um PNG colado no Confluence não é documentação viva — é um artefato que ninguém consegue diffar e por isso ninguém atualiza.

Distinção crítica entre as camadas 3 e 4: a especificação diz o que **deve** ser; a arquitetura diz o que **é**. Fundir as duas elimina a capacidade de enxergar o gap.

---

## Camada 5 — Contratos

Gerados, não escritos à mão.

| Artefato | Responde | Gatilho |
| --- | --- | --- |
| **OpenAPI / AsyncAPI / GraphQL SDL** | O contrato exato da interface | Gerado do código, no CI |
| **Error catalog** | Códigos de erro estáveis e o que cada um significa | Novo código de erro |
| **Event catalog / schema registry** | Que eventos existem, qual o payload, quem consome | Novo evento ou mudança de schema |
| **Versioning & deprecation policy** | Como quebramos compatibilidade sem quebrar o cliente | Raramente |

Se pode ser gerado, **não escreva**. Contrato escrito à mão diverge do código no primeiro dia. O que se escreve à mão é a política em volta dele (versionamento, depreciação), não o contrato.

---

## Camada 6 — Operação

O que sustenta em produção.

| Artefato | Responde | Gatilho |
| --- | --- | --- |
| **Runbooks** (um por alerta/procedimento) | O que fazer às 3h da manhã | Todo alerta novo; todo incidente que revelou passo faltando |
| **SLO/SLI + error budget policy** | Qual é o "bom o suficiente" e o que fazemos quando estoura | Trimestral ou por violação |
| **Postmortems** (blameless, append-only) | O que aconteceu, por quê, quais ações | Todo incidente relevante |
| **On-call handbook / escalation** | Quem chamar, quando | Mudança de time |
| **DR / restore drill log** | O backup realmente restaura? Quando testamos por último? | Todo drill |
| **Feature flag registry** | Que flags existem, quem é dono, quando morrem | Nova flag |

Postmortem só é vivo se as ações viram itens rastreados com dono e prazo — senão é catarse documentada. O registro de flags é o que evita a dívida invisível: flags temporárias que viram permanentes porque ninguém sabe se ainda são usadas.

---

## Camada 7 — Como se trabalha aqui

| Artefato | Responde | Gatilho |
| --- | --- | --- |
| **CONTRIBUTING + Definition of Done** | Quando uma tarefa está realmente pronta | Mudança de processo |
| **CLAUDE.md / AGENTS.md** | O contrato com agentes de IA: onde está a verdade, o que nunca fazer, como rodar | Quando um agente erra por falta de contexto |
| **Style guide** (só o que o linter não pega) | Nomenclatura, idioma, granularidade | Decisão de estilo nova |
| **Test strategy** | O que é unitário, o que é e2e, o que se mocka | Mudança de estratégia |
| **Onboarding path** | Primeiro dia, primeira semana | Toda vez que alguém novo tropeça |

O `CLAUDE.md`/`AGENTS.md` virou artefato de primeira classe. O padrão que funciona é ele ser **índice e política**, não conteúdo: diz *onde* está a verdade e *quais* regras nunca se quebram, e delega o resto. Conteúdo duplicado nele apodrece igual a qualquer outro.

O gatilho dele é o melhor que existe: toda vez que um agente ou uma pessoa nova erra por falta de contexto, é sinal de linha faltando. Isso torna o documento auto-corretivo.

---

## Camada 8 — Rastro histórico

- **CHANGELOG.md** no formato Keep a Changelog, voltado ao consumidor — não é `git log`.
- **Release notes**.
- **Migration / upgrade guides**.
- **Registro de depreciações**, com data de remoção e substituto.

---

## O que realmente faz a documentação ser viva

Os artefatos são a parte fácil. O que separa documentação viva de wiki morta são seis mecanismos:

1. **Docs-as-code, no mesmo PR.** Se a atualização da documentação não cabe no PR que mudou o código, ela não acontece. Isso implica mesmo repositório, texto plano, revisão no mesmo review.
2. **Gatilho, não cadência.** Cada documento diz no topo *quando* deve ser atualizado. "Revisar trimestralmente" é uma promessa que ninguém cumpre; "atualize no mesmo PR que muda `src/domain/billing`" é executável.
3. **Rastreabilidade por ID.** Código → regra, teste → regra, ADR → requisito, incidente → runbook. É o que permite responder "o que quebra se eu mudar essa regra" sem ler tudo.
4. **Automação no CI.** Link-checker, lint de estrutura, diagramas e contratos gerados, e um campo `last-reviewed` que faz o CI avisar quando passa de N meses.
5. **Ciclo de vida em vez de deleção.** `draft → accepted → superseded/deprecated`. Deletar apaga o "por quê"; marcar preserva.
6. **Fonte única com dono.** Cada fato mora em exatamente um arquivo; os outros linkam. Duplicata é garantia de divergência.

Teste de sanidade: **se ninguém lê, não está vivo**. Vinte documentos de 400 linhas cada é um sistema morto. Prefira poucos documentos curtos, gerados onde der, com índice claro.

---

## Anti-padrões que matam

- Wiki (Confluence/Notion) paralela ao repositório — diverge por construção.
- Diagrama em formato binário.
- ADR editado retroativamente.
- Documento que narra o código linha a linha — o código já faz isso melhor.
- "Cobertura documental" como meta — produz volume, não verdade.
- Documento sem dono no CODEOWNERS.
- Requisito sem ID.

---

## Conjunto mínimo por estágio

| Estágio | Comece com |
| --- | --- |
| **Solo / protótipo** | README, `AGENTS.md`/`CLAUDE.md`, ADRs, Open Decisions |
| **Time pequeno / produto real** | + Constitution, Requirements com IDs, Glossary, C4 nível 1–2, CHANGELOG, Test strategy |
| **Produção com usuários** | + SLOs, Runbooks, Postmortems, Threat model, contratos gerados, política de depreciação |
| **Múltiplos times** | + Context Map, RFC process, Debt Register, Event catalog |

A ordem importa: **ADR e Open Decisions antes de tudo**. Custam quase nada e são os únicos que capturam informação que se perde de verdade — o "por quê" e o "ainda não sabemos". O resto pode ser reconstruído a partir do código; esses dois, não.

---

## Estado atual do EsliphFinance

| Camada | Situação |
| --- | --- |
| 1 — Intenção | **Parcial.** Os princípios invioláveis estão dispersos no `CLAUDE.md`, sem Constitution própria. Sem Glossary. |
| 2 — Decisões | **Parcial.** `docs/open-decisions.md` (DA0xx) cobre bem o "ainda não decidido", mas não há ADRs: o "porquê" das decisões técnicas só existe no histórico de commits. |
| 3 — Especificação | **Coberta.** `docs/requirements.md` com IDs estáveis (RF/RNF/RN). |
| 4 — Arquitetura | **Coberta.** `docs/domains/` por contexto e `docs/architecture/` por eixo transversal. |
| 5 — Contratos | **Ausente.** Sem OpenAPI gerado nem catálogo de códigos de erro. |
| 6 — Operação | **Ausente.** Ainda não há produção. |
| 7 — Como se trabalha | **Coberta.** `CLAUDE.md`, `server/CLAUDE.md` e as skills em `.claude/skills/`. |
| 8 — Rastro histórico | **Ausente.** Sem CHANGELOG. |

Buracos mais relevantes hoje, em ordem: **ADRs**, **Glossary**, **CHANGELOG**.