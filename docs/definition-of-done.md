---
title: Definition of Done
owner: '@DANRLEY-RUAN-SAQUETTI'
trigger: >
  Quando um item passa a ser exigido para considerar trabalho pronto, ou deixa
  de ser — e toda vez que algo foi dado como pronto faltando um passo desta lista.
last-reviewed: 2026-09-02
---

# Definition of Done

Uma mudança está pronta quando todas as caixas abaixo estão marcadas. Cada item
diz **o que o verifica**: um check, um hook, ou uma pessoa. Item que ninguém
verifica não pertence a esta lista.

- [ ] O comportamento novo tem requisito com ID, escrito antes do código — verificação: `CI-1` e humana.
- [ ] Toda regra `active` é citada por ao menos um teste — verificação: `CI-3`.
- [ ] Todo ID citado resolve para um item existente e não retirado — verificação: `CI-2`.
- [ ] A decisão que não era óbvia virou ADR; a lacuna virou `DA-nnnn` — verificação: humana (`HK-3` intercepta a aceitação).
- [ ] O atalho consciente virou `TDR-nnnn` com gatilho de pagamento observável — verificação: `HK-7` lembra; registrar é humana.
- [ ] O doc dono de todo caminho vigiado tocado está no mesmo commit — verificação: `HK-4` e `HK-5`.
- [ ] Nenhum item congelado teve o corpo editado — verificação: `HK-1`.
- [ ] Nenhum artefato gerado foi editado à mão — verificação: `HK-2` e `CI-5` (`living-docs drift`).
- [ ] A mudança visível ao consumidor levou a entrada em `## [Unreleased]`, ou a razão escrita no commit — verificação: `CI-6` (`living-docs changelog --base <ref>`).
- [ ] A mensagem de commit cita o ID afetado — verificação: humana.

Acrescente aqui os passos do seu projeto (build, lint, deploy), **cada um com a
verificação que o cobre**. Item sem verificação vira intenção, e intenção não é
definição de pronto.
