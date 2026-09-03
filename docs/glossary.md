---
title: Glossary
owner: '@DANRLEY-RUAN-SAQUETTI'
trigger: >
  Termo de domínio novo em código, spec ou conversa; termo com dois
  significados; renomeação de conceito.
last-reviewed: 2026-09-03
---

# Glossary

O nome único de cada conceito do domínio. Um termo tem **um** significado; onde o negócio usa a mesma palavra para duas coisas — "tipo", "situação" —, a entrada é qualificada pelo dono do conceito, e a coluna "Não confundir com" diz de que ela se distingue.

A coluna **Nome no código** é o identificador que o código **deve** usar, não a descrição do que já existe: hoje só `Money` está em `server/src`, porque `server/src/domain` foi removido e volta com a fatia de domínio. Fixar o nome antes é o propósito desta tabela — é ela que evita o código chamar de uma coisa o que o requisito chama de outra.

| Termo | Definição | Nome no código | Não confundir com | Fonte | Status |
| --- | --- | --- | --- | --- | --- |
| Usuário | Pessoa dona de todos os registros do sistema; nenhum registro existe fora de um Usuário | `User` | — | RN-0001, RN-0010 | active |
| Token de acesso | Credencial de curta duração que autoriza cada requisição | `AccessToken` | Token de renovação, que não autoriza requisição | RN-0004, RN-0005 | active |
| Token de renovação | Segredo opaco de longa duração que emite um novo Token de acesso sem credencial, e é invalidado a cada uso | `RefreshToken` | Token de acesso; não é JWT | RN-0006, RN-0007, ADR-0008 | active |
| Exclusão lógica | Remoção que preserva o registro e os vinculados a ele, impedindo autenticação e novo uso do e-mail | `deletedAt` | Arquivamento, que é ocultar da seleção sem remover | RN-0012, RN-0014 | active |
| Arquivamento | Estado que retira o registro da seleção em novos lançamentos, preservando o histórico e admitindo desarquivamento | `archivedAt` | Exclusão lógica | RN-0024, RN-0025, RN-0083 | active |
| Grupo de Contas | Agrupamento que define a natureza operacional das Contas nele — se têm saldo ou limite e Faturas | `AccountGroup` | Categoria, que classifica lançamento e não conta | RN-0015, RN-0016 | active |
| Tipo do Grupo de Contas | Classificação do Grupo de Contas em "Padrão" ou "Cartão de Crédito" | `AccountGroupType` | Tipo da Transação; Tipo da repetição | RN-0015 | active |
| Conta | Onde o dinheiro está: tem saldo quando o grupo é "Padrão", e limite e Faturas quando é "Cartão de Crédito" | `Account` | Cartão de Débito, que é meio de pagamento e não Conta | RN-0018, RN-0022 | active |
| Cartão de Débito | Meio de pagamento vinculado a uma Conta de grupo "Padrão", cujo uso afeta o saldo dela diretamente | `DebitCard` | Conta; Cartão de crédito, que é Conta de grupo "Cartão de Crédito" | RN-0026, RN-0028 | active |
| Saldo | Saldo inicial da Conta acrescido das Transações efetivadas vinculadas a ela | `balance` | Saldo projetado; Saldo consolidado; Limite disponível | RN-0021 | active |
| Saldo inicial | Valor declarado no cadastro da Conta, do qual o saldo parte | `initialBalance` | Saldo | RN-0018 | active |
| Saldo projetado | Saldo acrescido das Transações "Previstas" | `projectedBalance` | Saldo, que só conta o efetivado | RN-0050 | active |
| Saldo consolidado | Soma dos saldos das Contas não arquivadas de grupos "Padrão" | `consolidatedBalance` | Saldo, que é de uma Conta só | RN-0077 | active |
| Limite | Teto de crédito de uma Conta de grupo "Cartão de Crédito" | `limit` | Saldo, que a Conta de cartão não possui; Valor limite do Orçamento | RN-0019, RN-0022 | active |
| Limite disponível | Limite subtraído das Faturas em aberto e dos lançamentos ainda não faturados | `availableLimit` | Limite | RN-0023 | active |
| Dia de fechamento | Dia em que a Fatura para de receber lançamentos, ajustado ao último dia do mês quando não existir | `closingDay` | Dia de vencimento | RN-0019, RN-0020 | active |
| Dia de vencimento | Dia em que a Fatura precisa ser paga, ajustado ao último dia do mês quando não existir | `dueDay` | Dia de fechamento | RN-0019, RN-0020 | active |
| Categoria | Classificação hierárquica e obrigatória do lançamento de Receita ou Despesa, e espinha do relatório | `Category` | Tag, que é livre, múltipla e opcional | RN-0029, RN-0042 | active |
| Subcategoria | Categoria vinculada a outra Categoria, em um único nível de profundidade | `Category` com `parentId` | Categoria raiz, que não pode ser filha de subcategoria | RN-0031, RN-0032 | active |
| Natureza | Classificação da Categoria em "Receita", "Despesa" ou "Ambas", que precisa ser compatível com o Tipo da Transação | `CategoryNature` | Tipo da Transação, que é da Transação e não da Categoria | RN-0030, RN-0042 | active |
| Tag | Rótulo livre, múltiplo e opcional da Transação, independente da hierarquia de Categorias | `Tag` | Categoria | RN-0036, RN-0038 | active |
| Transação | Lançamento de Receita, Despesa ou Transferência com data, valor, conta, tipo e situação | `Transaction` | Lançamento Favorito, que é modelo e não lançamento | RN-0039, RN-0040 | active |
| Tipo da Transação | Classificação da Transação em "Receita", "Despesa" ou "Transferência", da qual o sinal do valor deriva | `TransactionType` | Natureza, que é da Categoria; Tipo do Grupo de Contas | RN-0039, RN-0041 | active |
| Transferência | Transação que move dinheiro entre duas Contas de grupo "Padrão" do mesmo dono, sem categoria e sem compor receita ou despesa | `TransactionType.Transfer` | Receita e Despesa; Pagamento de Fatura, que não é Transferência | RN-0044, RN-0047 | active |
| Situação da Transação | Estado da Transação em "Prevista" ou "Efetivada" | `TransactionStatus` | Situação da Fatura, que tem outros quatro valores | RN-0048 | active |
| Efetivação | Passagem da Transação de "Prevista" para "Efetivada", com a data em que de fato ocorreu | `settle` | Reversão | RN-0086, RN-0088 | active |
| Reversão | Passagem da Transação de "Efetivada" de volta para "Prevista" | `revert` | Efetivação; Estorno, que é lançamento novo | RN-0087 | active |
| Valor monetário | Quantia sempre representada como inteiro em centavos, com duas casas apenas na exibição | `Money` | — | RNF-0004, ADR-0003 | active |
| Fatura | Conjunto dos lançamentos de uma Conta de cartão num período de fechamento, com valor total e data de vencimento | `Invoice` | Conta, que a Fatura não é | RN-0052, RN-0054 | active |
| Situação da Fatura | Estado da Fatura em "Aberta", "Fechada", "Parcialmente Paga" ou "Paga" | `InvoiceStatus` | Situação da Transação | RN-0055 | active |
| Pagamento de Fatura | Operação própria que debita uma Conta de grupo "Padrão" e abate o saldo devedor da Fatura | `InvoicePayment` | Transferência; Despesa, que já foi registrada na compra | RN-0056, RN-0057 | active |
| Estorno | Lançamento que abate o valor total da Fatura correspondente | `refund` | Receita, que aumenta o patrimônio; Reversão | RN-0058 | active |
| Repetição | Configuração que faz uma Transação se repetir, do tipo "Padrão" ou "Parcelas" | `Recurrence` | — | RN-0059, RN-0060 | active |
| Parcelamento | Repetição do tipo "Parcelas", com quantidade definida e diferença de arredondamento na primeira parcela | `Installment` | Repetição "Padrão", que é indefinida e gerada sob demanda | RN-0064, RN-0065 | active |
| Ocorrência | Instância de uma Repetição "Padrão", gerada sob demanda e persistida só quando editada ou efetivada | `RecurrenceOccurrence` | Parcela, que nasce persistida | RN-0063 | active |
| Escopo de edição da série | Alcance de uma edição ou exclusão de Ocorrência: "Somente esta", "Esta e as futuras" ou "Todas" | `RecurrenceEditScope` | — | RN-0066, RN-0067 | active |
| Orçamento | Valor limite de gasto de uma Categoria e suas subcategorias num período, com alerta configurável | `Budget` | Meta, que acumula em vez de limitar | RN-0069, RN-0070 | active |
| Meta | Valor alvo a acumular numa Conta vinculada, com data alvo opcional | `Goal` | Orçamento | RN-0073, RN-0074 | active |
| Lançamento Favorito | Dados pré-preenchidos de uma Transação, guardados para registro rápido | `FavoriteEntry` | Transação, que o Lançamento Favorito apenas gera | RN-0075, RN-0076 | active |
| Projeção de fluxo de caixa | Previsão que considera as Transações "Previstas" e as ocorrências futuras das Repetições | `CashFlowProjection` | Saldo consolidado, que é do presente | RN-0079 | active |

<!-- Termos entram como linhas acima. Skill dona: glossary-keeper. -->
