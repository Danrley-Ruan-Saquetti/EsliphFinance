---
title: Regras de negócio
owner: "@DANRLEY-RUAN-SAQUETTI"
trigger: >
  Antes de implementar qualquer comportamento, e a toda regra de negócio
  nova, alterada ou revogada.
last-reviewed: 2026-09-02
---

# Regras de negócio

## Usuários

### RN-0001 — O cadastro do _Usuário_ deve conter o **nome**, o **e-mail** e a **senha**.

- **status:** active

### RN-0002 — O **e-mail** do _Usuário_ deve ser único no sistema.

- **status:** active

### RN-0003 — A **senha** do _Usuário_ deve conter no mínimo 8 caracteres.

- **status:** active

### RN-0004 — A autenticação do _Usuário_ é realizada por **e-mail** e **senha**, resultando na emissão de um **token de acesso** e de um **token de renovação**.

- **status:** active

### RN-0005 — O **token de acesso** possui prazo de expiração curto, exigindo renovação após o seu vencimento.

- **status:** active

### RN-0006 — O **token de renovação** possui prazo de expiração superior ao do **token de acesso** e permite a emissão de um novo **token de acesso** sem a informação das credenciais.

- **status:** active

### RN-0007 — O **token de renovação** é invalidado após a sua utilização, sendo emitido um novo **token de renovação** em conjunto com o novo **token de acesso**.

- **status:** active

### RN-0008 — O encerramento da sessão pelo _Usuário_ deve invalidar o **token de renovação** correspondente.

- **status:** active

### RN-0009 — A alteração da **senha** exige a informação da **senha** atual e deve invalidar os **tokens de renovação** ativos do _Usuário_.

- **status:** active

### RN-0010 — Todos os registros do sistema pertencem a um _Usuário_.

- **status:** active

### RN-0011 — O _Usuário_ só pode consultar e manipular os registros dos quais é dono.

- **status:** active

### RN-0012 — A exclusão do _Usuário_ é lógica, preservando os registros vinculados a ele.

- **status:** active

### RN-0013 — O _Usuário_ excluído não pode se autenticar e deve ter os seus **tokens de renovação** invalidados.

- **status:** active

### RN-0014 — O **e-mail** de um _Usuário_ excluído permanece indisponível para novos cadastros.

- **status:** active

## Grupos de Contas

### RN-0015 — Os _Grupos de Contas_ podem ser do **tipo** "Padrão" ou "Cartão de Crédito".

- **status:** active

### RN-0016 — O cadastro do _Grupo de Contas_ deve conter o **nome** e o **tipo** (Default: Padrão).

- **status:** active

### RN-0017 — O _Grupo de Contas_ não pode ser excluído quando possuir _Contas_ vinculadas.

- **status:** active

### RN-0085 — O _Grupo de Contas_ não pode ter o **tipo** alterado quando possuir _Contas_ vinculadas.

- **status:** active

## Contas

### RN-0018 — O cadastro da _Conta_ deve conter o **nome**, o **grupo** (referente à _Grupo de Contas_), o **saldo inicial** (Default: 0), o **ícone** e a **cor**.

- **status:** active

### RN-0019 — Quando a _Conta_ for de um **grupo** do **tipo** "Cartão de Crédito", deve-se informar o **limite**, o **dia de fechamento** e o **dia de vencimento**.

- **status:** active

### RN-0020 — O **dia de fechamento** e o **dia de vencimento** devem estar entre 1 e 31, sendo ajustados para o último dia do mês quando o mês não possuir o dia informado.

- **status:** active

### RN-0021 — O **saldo** de uma _Conta_ é o **saldo inicial** acrescido das _Transações_ efetivadas vinculadas a ela.

- **status:** active

### RN-0022 — _Contas_ de um **grupo** do **tipo** "Cartão de Crédito" não possuem **saldo**, sendo controladas por **limite** e _Faturas_.

- **status:** active

### RN-0023 — O **limite disponível** de uma _Conta_ do **tipo** "Cartão de Crédito" é o **limite** subtraído das _Faturas_ em aberto e dos lançamentos ainda não faturados.

- **status:** active

### RN-0024 — A _Conta_ não pode ser excluída quando possuir _Transações_ vinculadas, podendo ser arquivada.

- **status:** active

### RN-0025 — A _Conta_ arquivada não deve ser exibida para seleção em novos lançamentos, preservando o histórico existente.

- **status:** active

## Cartões de Débito

### RN-0026 — O _Cartão de Débito_ é um meio de pagamento vinculado a uma _Conta_ de um **grupo** do **tipo** "Padrão", não constituindo uma _Conta_.

- **status:** active

### RN-0027 — O cadastro do _Cartão de Débito_ deve conter o **nome** e a **conta vinculada**.

- **status:** active

### RN-0028 — A _Transação_ realizada por meio de um _Cartão de Débito_ afeta diretamente o **saldo** da **conta vinculada**.

- **status:** active

## Categorias

### RN-0029 — O cadastro de _Categorias_ deve conter o **nome**, a **natureza**, o **ícone** e a **cor**.

- **status:** active

### RN-0030 — A **natureza** da _Categoria_ pode ser "Receita", "Despesa" ou "Ambas".

- **status:** active

### RN-0031 — As _Categorias_ podem ser classificadas como subcategorias, sendo vinculadas à outra **categoria**.

- **status:** active

### RN-0032 — Uma _Categoria_ não pode ser subcategoria de outra subcategoria, nem ser movida para tornar-se subcategoria de uma subcategoria.

- **status:** active

### RN-0033 — A subcategoria deve possuir **natureza** compatível com a **categoria** à qual está vinculada.

- **status:** active

### RN-0034 — A _Categoria_ não pode ser excluída quando possuir _Transações_ ou subcategorias vinculadas, podendo ser arquivada.

- **status:** active

### RN-0035 — A _Categoria_ arquivada não deve ser exibida para seleção em novos lançamentos, preservando o histórico existente.

- **status:** active

### RN-0083 — A _Categoria_ arquivada pode ser desarquivada, voltando a ser exibida para seleção em novos lançamentos.

- **status:** active

### RN-0084 — A subcategoria de uma _Categoria_ arquivada não deve ser exibida para seleção em novos lançamentos, ainda que não esteja arquivada.

- **status:** active

## Tags

### RN-0036 — O cadastro de _Tags_ deve conter o **nome**.

- **status:** active

### RN-0037 — Uma _Transação_ pode possuir nenhuma ou várias _Tags_.

- **status:** active

### RN-0038 — As _Tags_ são independentes da hierarquia de _Categorias_.

- **status:** active

## Transações

### RN-0039 — As _Transações_ podem ser do **tipo** "Receita", "Despesa" ou "Transferência".

- **status:** active

### RN-0040 — Uma _Transação_ deve conter a **data**, o **valor**, **descrição** (opcional), **conta** (referente à _Conta_), o **tipo** e a **situação**.

- **status:** active

### RN-0041 — O **valor** da _Transação_ deve ser maior que zero, sendo o sinal derivado do **tipo**.

- **status:** active

### RN-0042 — As _Transações_ do **tipo** "Receita" e "Despesa" devem conter a **categoria** (referente à _Categoria_), cuja **natureza** deve ser compatível com o **tipo** da _Transação_.

- **status:** active

### RN-0043 — A _Transação_ do **tipo** "Transferência" não possui **categoria**.

- **status:** active

### RN-0044 — Quando a _Transação_ for do **tipo** "Transferência", deve-se informar a **conta de origem** (referente à _Conta_) e **conta de destino** (referente à _Conta_).

- **status:** active

### RN-0045 — A **conta de origem** e **conta de destino** de uma _Transação_ do **tipo** "Transferência" devem pertencer a um **grupo** do **tipo** "Padrão".

- **status:** active

### RN-0046 — A **conta de origem** e a **conta de destino** de uma _Transação_ do **tipo** "Transferência" não podem ser a mesma.

- **status:** active

### RN-0047 — As _Transações_ do **tipo** "Transferência" não compõem os totais de receita e despesa nos relatórios.

- **status:** active

### RN-0048 — A **situação** da _Transação_ pode ser "Prevista" ou "Efetivada".

- **status:** active

### RN-0049 — A _Transação_ com **data** futura é criada como "Prevista" e a _Transação_ com **data** igual ou anterior à atual é criada como "Efetivada", podendo o padrão ser configurado pelo usuário.

- **status:** active

### RN-0050 — Apenas as _Transações_ "Efetivadas" compõem o **saldo** da _Conta_; as _Transações_ "Previstas" compõem o **saldo projetado**.

- **status:** active

### RN-0051 — A _Transação_ pode conter **anexos**.

- **status:** active

### RN-0086 — A efetivação da _Transação_ só é permitida quando a sua **situação** for "Prevista", sendo rejeitada quando já estiver "Efetivada".

- **status:** active

### RN-0087 — A reversão da _Transação_ só é permitida quando a sua **situação** for "Efetivada", sendo rejeitada quando já estiver "Prevista".

- **status:** active

### RN-0088 — A efetivação da _Transação_ permite informar a **data** em que ela efetivamente ocorreu, atualizando a **data** da _Transação_.

- **status:** active

### RN-0089 — A alteração do **tipo** da _Transação_ de ou para "Transferência" não é permitida na edição, sendo necessário excluir e criar um novo lançamento.

- **status:** active

## Faturas de Cartão de Crédito

### RN-0052 — A _Transação_ lançada em uma _Conta_ do **tipo** "Cartão de Crédito" não afeta **saldo**, sendo atribuída a uma _Fatura_.

- **status:** active

### RN-0053 — A _Transação_ é atribuída à _Fatura_ cujo período de fechamento contém a sua **data**; lançamentos com **data** posterior ao **dia de fechamento** são atribuídos à _Fatura_ seguinte.

- **status:** active

### RN-0054 — A _Fatura_ deve conter o **período**, o **valor total** e a **data de vencimento**.

- **status:** active

### RN-0055 — A **situação** da _Fatura_ pode ser "Aberta", "Fechada", "Parcialmente Paga" ou "Paga".

- **status:** active

### RN-0056 — O **pagamento** da _Fatura_ é uma operação própria que debita uma _Conta_ de um **grupo** do **tipo** "Padrão" e abate o saldo devedor da _Fatura_, não constituindo uma _Transação_ do **tipo** "Transferência".

- **status:** active

### RN-0057 — A _Fatura_ admite **pagamento** parcial e **pagamento** antecipado.

- **status:** active

### RN-0058 — O estorno lançado em uma _Conta_ do **tipo** "Cartão de Crédito" abate o **valor total** da _Fatura_ correspondente.

- **status:** active

## Repetição de Transações

### RN-0059 — A _Transação_ pode ser marcada para repetir.

- **status:** active

### RN-0060 — A configuração da repetição da _Transação_ pode ser de dois **tipos**: "Padrão" ou "Parcelas".

- **status:** active

### RN-0061 — Quando a repetição da _Transação_ for do **tipo** "Padrão", deverá ser selecionada a frequência da repetição: "Diária", "Dias da Semana", "Fim de Semana", "Semanalmente", "A cada 2 semanas", "A cada 4 semanas", "Mensalmente", "Fim do mês", "A cada 2 meses", "A cada 3 meses", "A cada 4 meses", "A cada 6 meses", "Anualmente".

- **status:** active

### RN-0062 — A repetição do **tipo** "Padrão" é indefinida, admitindo **data final** opcional.

- **status:** active

### RN-0063 — As ocorrências da repetição do **tipo** "Padrão" devem ser geradas sob demanda, sendo persistidas apenas quando editadas ou efetivadas.

- **status:** active

### RN-0064 — Quando a repetição da _Transação_ for do **tipo** "Parcelas", deverá ser informada a **quantidade de parcelas** (mínimo de 2), gerando _Transações_ vinculadas e identificadas pelo número da parcela e pelo total.

- **status:** active

### RN-0065 — A diferença de arredondamento na divisão do **valor** entre as parcelas deve ser aplicada na primeira parcela.

- **status:** active

### RN-0066 — A edição e a exclusão de uma ocorrência de repetição devem permitir o escopo "Somente esta", "Esta e as futuras" ou "Todas".

- **status:** active

### RN-0067 — A ocorrência editada individualmente é tratada como exceção e não deve ser sobrescrita por alterações posteriores na série.

- **status:** active

### RN-0068 — As parcelas podem ser antecipadas, permitindo a quitação do valor restante.

- **status:** active

## Orçamentos

### RN-0069 — O cadastro do _Orçamento_ deve conter a **categoria** (referente à _Categoria_), o **período** e o **valor limite**.

- **status:** active

### RN-0070 — O consumo do _Orçamento_ corresponde às _Transações_ do **tipo** "Despesa" da **categoria** e de suas subcategorias dentro do **período**.

- **status:** active

### RN-0071 — As _Transações_ do **tipo** "Transferência" não consomem _Orçamento_.

- **status:** active

### RN-0072 — O _Orçamento_ deve gerar alerta ao atingir um percentual configurável do **valor limite** e ao ultrapassá-lo.

- **status:** active

## Metas

### RN-0073 — O cadastro da _Meta_ deve conter o **nome**, o **valor alvo**, a **data alvo** (opcional) e a **conta vinculada** (referente à _Conta_).

- **status:** active

### RN-0074 — O progresso da _Meta_ corresponde ao **saldo** da **conta vinculada** em relação ao **valor alvo**.

- **status:** active

## Lançamentos Favoritos

### RN-0075 — O _Lançamento Favorito_ armazena os dados pré-preenchidos de uma _Transação_ para registro rápido.

- **status:** active

### RN-0076 — A _Transação_ gerada a partir de um _Lançamento Favorito_ pode ser editada antes da confirmação.

- **status:** active

## Painel e Relatórios

### RN-0077 — O **saldo consolidado** corresponde à soma dos **saldos** das _Contas_ não arquivadas pertencentes a **grupos** do **tipo** "Padrão".

- **status:** active

### RN-0078 — O painel deve apresentar o **saldo consolidado**, o total de receitas e despesas do período, os gastos por _Categoria_ e a evolução mensal.

- **status:** active

### RN-0079 — A projeção de fluxo de caixa deve considerar as _Transações_ "Previstas" e as ocorrências futuras das repetições.

- **status:** active

## Notificações

### RN-0080 — O sistema deve notificar o usuário sobre o vencimento de _Faturas_.

- **status:** active

### RN-0081 — O sistema deve notificar o usuário sobre as _Transações_ "Previstas" do dia.

- **status:** active

### RN-0082 — O sistema deve notificar o usuário quando um _Orçamento_ atingir o percentual configurado ou for ultrapassado.

- **status:** active
