---
title: Constitution
owner: '@DANRLEY-RUAN-SAQUETTI'
trigger: >
  Emenda deliberada — nunca como efeito colateral de outra tarefa.
last-reviewed: 2026-09-03
version: 2
---
# Constitution

O que é inviolável no EsliphFinance. Cada princípio nomeia **o que o verifica**; princípio sem enforcement é slogan, e slogan não pertence a este arquivo. Regra do domínio mora em `docs/requirements/`; decisão técnica pontual, em `docs/adr/`.

## Princípios

1. **Todo registro pertence a um Usuário, e só ele o alcança.** O dono nunca vem do cliente, e o acesso a registro alheio responde como registro inexistente — verificado por **revisão** (`code-reviewer`), que procura pela conferência de propriedade dentro do caso de uso e pelo teste de acesso cruzado entre dois usuários que ADR-0006 e ADR-0007 exigem. RN-0010 e RN-0011 são a regra; este princípio é a garantia de que ela não depende de o autor lembrar.
2. **Comportamento sem regra escrita não é implementado.** Não se inventa regra em silêncio: o que não tem RN vira uma decisão em aberto e a implementação para ali — verificado por **`HK-8`** (guarda de decisão aberta) e **`CI-1`**.
3. **Dinheiro nunca circula como ponto flutuante.** Todo valor monetário é inteiro em centavos dentro de `Money`, da entrada à persistência, e as duas casas existem só na exibição — verificado pelo **`InvariantError`** que `Money` lança para qualquer coisa que não seja inteiro seguro, e pelos **testes unitários de `Money`**, que rodam em `server-tests.yml`. RNF-0004 é a regra; ADR-0003 é como ela se cumpre.
4. **O framework não entra no domínio.** Nenhum arquivo de `src/core` ou `src/domain` importa `@nestjs/*`, `drizzle-orm` ou tipos de `express` — verificado por **revisão** (`code-reviewer`), pelo import, que é o que torna a violação visível sem interpretar intenção. ADR-0001 registra a decisão e o que ela custa.
5. **O que a pessoa lê é português; o que a máquina consome é inglês.** Mensagem de resposta, mensagem de validação e texto de erro exibível saem em português; identificador, `code` de erro e log ficam em inglês — verificado por **revisão** (`code-reviewer`) e pelos **testes do `AllExceptionsFilter`**, que afirmam `code` e mensagem. ADR-0004 fixa o contrato.
6. **O documento dono muda no mesmo PR que o código, e item aceito não se reescreve.** Um ADR errado ganha `superseded` e um ADR novo explica o erro; ele não se corrige no lugar — verificado por **`HK-1`** (append-only), **`HK-4`** e **`HK-5`** (vínculo código→doc) e **`CI-7`**.
7. **Nenhum agente promove estado.** `draft → accepted` e `open → resolved` são ato humano — verificado por **`HK-3`**.

## Log de emendas

- 2026-09-02 — v1 — Criação inicial — humana.
- 2026-09-03 — v2 — Substituição do princípio-exemplo da semente pelos sete princípios que o repositório já praticava sem os ter escrito aqui. Nenhum princípio novo foi criado: os itens 1, 3 e 5 vinham da prosa de `CLAUDE.md`, os itens 4 e 6 de `docs/architecture/` e do índice de documentação viva, e os itens 2 e 7 já eram cobrados por hook. O enforcement de cada um foi conferido contra o que existe hoje — por isso os itens 1, 4 e 5 nomeiam revisão, e não CI: `server-tests.yml` roda apenas os testes unitários.

<!-- Skill dona: charter-keeper. -->

