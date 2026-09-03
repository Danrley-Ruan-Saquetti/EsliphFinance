---
id: ADR-0009
title: O schema Drizzle é a fonte das migrations; SQL aplicado nunca é editado
status: accepted
owner: "@DANRLEY-RUAN-SAQUETTI"
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-09-03
relates-to: [RNF-0003, ADR-0003, ADR-0010]
supersedes: null
superseded-by: null
---

# ADR-0009 — O schema Drizzle é a fonte das migrations; SQL aplicado nunca é editado

## Contexto

Há duas fontes possíveis para a estrutura do banco: o SQL das migrations ou a declaração de schema em TypeScript. Quem for a fonte determina de onde saem os tipos que o mapper e a consulta usam — e, portanto, se uma coluna alterada quebra em tempo de compilação ou em produção.

## Alternativas consideradas

1. **SQL first: DDL manual versionado como fonte, com o schema TypeScript escrito à mão para acompanhar.** Descartada porque o tipo do `db` deixaria de derivar da estrutura real: as duas cópias divergem, e o mapper perde a checagem em tempo de compilação que é a razão de ele existir (ADR-0010).
2. **`drizzle-kit push` direto contra o banco.** Descartada porque não deixa histórico: não há o que revisar num PR, não há o que rodar em CI, e não há como reproduzir o estado de um ambiente.

## Decisão

O schema em `infra/database/drizzle/schemas/` é a **fonte**; alterar tabela é editar o schema e **gerar** a migration. Nunca DDL manual, e **nunca editar SQL já aplicado** — o Drizzle Kit mantém `migrations/meta/_journal.json` e snapshots por versão, e mexer no passado desalinha os dois. Dois detalhes fazem parte da decisão: os arquivos de schema importam os irmãos por **caminho relativo**, não pelo alias `@infra/...`, porque o Drizzle Kit os lê fora do build do Nest e não resolve os path aliases do `tsconfig`; e `schemas/index.ts` é um barril com **função de runtime** — é o que `drizzle.config.ts` aponta, é o que tipa o `db`, e é o que o helper `cleanDatabase` varre para truncar tudo nos testes.

## Consequências

### O que se ganha

- O tipo e a tabela nunca divergem: mudar uma coluna quebra o mapper em tempo de compilação.
- Tabela nova entra na limpeza dos testes de graça, assim que entra no barril.
- O histórico de migrations é revisável e reproduzível, em PR e em CI.

### O que se aceita perder

- Tabela que ficar de fora do barril **não é gerada nem limpa**, e a falha é silenciosa: o teste passa com resíduo da execução anterior.
- O caminho relativo dentro de `schemas/` é uma exceção ao alias usado no resto do repositório. Parece inconsistência, e "corrigir" para o alias quebra a geração de migration sem quebrar a aplicação — que é o pior formato de falha.
- Correção de uma migration errada só existe como migration nova: o passo torto fica no histórico para sempre.
