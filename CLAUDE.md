# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Visão geral

EsliphFinance é um aplicativo de finanças pessoais. O repositório é um monorepo sem ferramenta de workspaces — cada diretório é um projeto independente, com o seu próprio `package.json`, lockfile e toolchain. Não há build nem script que amarre os projetos: eles são desenvolvidos e executados separadamente, a partir de dentro do respectivo diretório. O CI é por projeto — um workflow em `.github/workflows/` por diretório, disparado apenas pelas alterações naquele caminho.

| Diretório | O que é |
| --------- | ------- |
| `server/` | API backend (NestJS + PostgreSQL, tudo via Docker; nada de `npm` no host — os comandos são alvos do `Makefile`, e `make help` lista todos; a execução é da skill `stack-runner`). **Tem o seu próprio `CLAUDE.md`** com stack, arquitetura e comandos — leia-o antes de mexer em qualquer coisa aqui. |
| `docs/`   | Documentação viva. `.ownership.yml` é o mapa de propriedade — todo artefato, o dono e a skill responsável. Ver o índice abaixo. |
| `.github/workflows/` | Pipelines do GitHub Actions. `server-tests.yml` roda os testes unitários e e2e do backend nos pushes e pull requests para `main` e `develop`, direto no Node 22 do runner (sem Docker), com o Postgres como *service container*. |

## `docs/requirements/` é a fonte de verdade

Todo o domínio está especificado em `docs/requirements/`, em português, com identificadores estáveis:

- **RF-0001…** requisitos funcionais
- **RNF-0001…** requisitos não funcionais
- **RN-0001…** regras de negócio (a maior parte do documento, agrupada por contexto: usuários, contas, categorias, transações, faturas, repetições, orçamentos, metas, relatórios, notificações)

Antes de implementar qualquer comportamento, localize a RN correspondente — ela costuma conter restrições que não são óbvias pelo nome da feature (exclusão lógica vs. arquivamento, compatibilidade de natureza entre categoria e transação, atribuição de lançamentos a faturas, escopo de edição de séries repetidas). Ao escrever código ou testes, referencie a RN. Se o requisito não cobrir o caso, pergunte em vez de inventar a regra: os pontos ainda indefinidos ficam em `docs/open-decisions.md`, identificados por **DA-00xx**, e um item que ainda está lá não tem regra e não deve ser implementado.

A manutenção desses documentos é da skill `business-analyst` — use-a sempre que precisar localizar, interpretar, criar ou alterar um requisito.

O que sustenta todos os domínios está em `docs/architecture/`, um arquivo por eixo transversal; `server/CLAUDE.md` diz quando consultá-los. A contrapartida por contexto de domínio — `docs/domains/` — foi removida junto com `server/src/domain` e volta com ela.

Regras que valem sempre:

- Valores monetários são inteiros em centavos (RNF-0004); a formatação com 2 casas é só na exibição.
- Todo registro pertence a um usuário e só pode ser lido ou alterado por ele (RN-0010, RN-0011).
- Autenticação por par de tokens JWT, com o token de renovação rotacionado e invalidado a cada uso (RNF-0005, RN-0004–RN-0009).

## Índice da documentação viva

Cada fato mora em exatamente um arquivo, com um dono e uma skill responsável. `docs/.ownership.yml` é a fonte desse mapa — este índice só diz qual artefato responde a quê. Nunca copie conteúdo para cá: duplicata apodrece.

| Pergunta | Artefato | Skill dona |
| -------- | -------- | ---------- |
| O que é inviolável aqui? Para quem é o produto? | `docs/charter/constitution.md`, `docs/charter/vision.md` | `charter-keeper` |
| O que este termo do domínio significa? | `docs/glossary.md` | `glossary-keeper` |
| Por que isto e não aquilo? | `docs/adr/` (**ADR-nnnn**) | `decision-recorder` |
| O que ainda **não** foi decidido? | `docs/open-decisions.md` (**DA-nnnn**) | `decision-recorder` |
| Que dívida assumimos de propósito, e quando se paga? | `docs/decisions/debt/` (**TDR-nnnn**) | `decision-recorder` |
| Qual é a regra? | `docs/requirements/` (**RF/RNF/RN-nnnn**) | `requirements-keeper` · `business-analyst` |
| O que **está** construído? | `docs/architecture/` | `platform-architect` |
| Como se trabalha aqui? Quando está pronto? | `CONTRIBUTING.md`, `docs/definition-of-done.md` | `working-agreements-keeper` |

Regras que o enforcement cobra, e que valem antes dele:

- **Nunca invente regra em silêncio.** Comportamento sem RN escrita vira uma **DA** e a implementação para ali. Um item em `open-decisions.md` não tem regra e não deve ser implementado.
- **ADR aceito é imutável.** Ele não se corrige: ganha `status: superseded` e um ADR novo explica o erro.
- **Nenhum agente promove estado.** `draft → accepted` e `open → resolved` são ato humano.
- **O doc dono muda no mesmo PR que o código.** `watches` em `docs/.ownership.yml` diz qual doc cada caminho de código arrasta junto.
- **ID nunca é reciclado.** Os retirados ficam em `docs/ids-retired.txt`.

O gate roda em `.github/workflows/living-docs.yml`; localmente, `living-docs validate`.

## Convenções do repositório

- **Idioma**: código, nomes de arquivos e identificadores em inglês; documentação, requisitos, comentários e mensagens de commit em português.
- **Idioma das mensagens**: todo texto que chega ao usuário é em **português** — o `message` e o `details[].message` das respostas da API, os erros de validação de entrada e de invariante de domínio. Continuam em inglês apenas o que não é exibido: identificadores, códigos de erro (`RESOURCE_NOT_FOUND`), logs e as mensagens de falha na validação das variáveis de ambiente, que são diagnóstico de quem opera a aplicação.
- **Commits**: prefixo de tipo em minúsculo seguido de descrição capitalizada — `config: Configurando Vitest com coverage para testes`, `refactor: Alterando para usar o nome do banco definido na variável de ambiente`.
- **Branches**: `master` é a branch principal; o backend está sendo desenvolvido na branch `server`.
- **Variáveis de ambiente**: cada projeto tem o seu `.env` (ignorado pelo git) e um `.env.example` versionado. Ao introduzir uma variável nova, atualize o `.env.example` correspondente.
