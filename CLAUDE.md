# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Visão geral

EsliphFinance é um aplicativo de finanças pessoais. O repositório é um monorepo sem ferramenta de workspaces — cada diretório é um projeto independente, com o seu próprio `package.json`, lockfile e toolchain. Não há build nem script que amarre os projetos: eles são desenvolvidos e executados separadamente, a partir de dentro do respectivo diretório. O CI é por projeto — um workflow em `.github/workflows/` por diretório, disparado apenas pelas alterações naquele caminho.

| Diretório | O que é |
| --------- | ------- |
| `server/` | API backend (NestJS + PostgreSQL, tudo via Docker; nada de `npm` no host — os comandos são alvos do `Makefile`, e `make help` lista todos). **Tem o seu próprio `CLAUDE.md`** com stack, arquitetura e comandos — leia-o antes de mexer em qualquer coisa aqui. |
| `mobile/` | Aplicativo Expo / React Native, com scripts npm próprios rodando direto no host. Consulte o diretório para a sua stack e comandos. |
| `docs/`   | Documentação de produto. |
| `.github/workflows/` | Pipelines do GitHub Actions. `server-tests.yml` roda os testes unitários e e2e do backend nos pushes e pull requests para `main` e `develop`, direto no Node 22 do runner (sem Docker), com o Postgres como *service container*. |

## `docs/requirements.md` é a fonte de verdade

Todo o domínio está especificado em `docs/requirements.md`, em português, com identificadores estáveis:

- **RF001…** requisitos funcionais
- **RNF001…** requisitos não funcionais
- **RN001…** regras de negócio (a maior parte do documento, agrupada por contexto: usuários, ativos, categorias, transações, faturas, repetições, orçamentos, metas, relatórios, notificações)

Antes de implementar qualquer comportamento, localize a RN correspondente — ela costuma conter restrições que não são óbvias pelo nome da feature (exclusão lógica vs. arquivamento, compatibilidade de natureza entre categoria e transação, atribuição de lançamentos a faturas, escopo de edição de séries repetidas). Ao escrever código ou testes, referencie a RN. Se o requisito não cobrir o caso, pergunte em vez de inventar a regra; o documento termina com uma seção **Decisões em Aberto** para pontos ainda indefinidos.

Regras que atravessam os dois projetos e valem sempre:

- Valores monetários são inteiros em centavos (RNF004); a formatação com 2 casas é só na exibição.
- Todo registro pertence a um usuário e só pode ser lido ou alterado por ele (RN010, RN011).
- Autenticação por par de tokens JWT, com o token de renovação rotacionado e invalidado a cada uso (RNF005, RN004–RN009).

## Convenções do repositório

- **Idioma**: código, nomes de arquivos e identificadores em inglês; documentação, requisitos, comentários e mensagens de commit em português.
- **Idioma das mensagens**: todo texto que chega ao usuário é em **português** — o `message` e o `details[].message` das respostas da API, os erros de validação de entrada e de invariante de domínio, e os textos de tela do mobile. Continuam em inglês apenas o que não é exibido: identificadores, códigos de erro (`RESOURCE_NOT_FOUND`), logs e as mensagens de falha na validação das variáveis de ambiente, que são diagnóstico de quem opera a aplicação.
- **Commits**: prefixo de tipo em minúsculo seguido de descrição capitalizada — `config: Configurando Vitest com coverage para testes`, `refactor: Alterando para usar o nome do banco definido na variável de ambiente`.
- **Branches**: `master` é a branch principal; o backend está sendo desenvolvido na branch `server`.
- **Variáveis de ambiente**: cada projeto tem o seu `.env` (ignorado pelo git) e um `.env.example` versionado. Ao introduzir uma variável nova, atualize o `.env.example` correspondente.
