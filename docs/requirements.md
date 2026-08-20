# Requisitos Funcionais

-   RF001 - O sistema deve permitir dar manutenção em Usuários.
-   RF002 - O sistema deve permitir a autenticação do Usuário.
-   RF003 - O sistema deve permitir dar manutenção em Grupos de Contas.
-   RF004 - O sistema deve permitir dar manutenção em Contas.
-   RF005 - O sistema deve permitir dar manutenção em Cartões de Débito.
-   RF006 - O sistema deve permitir dar manutenção em Categorias.
-   RF007 - O sistema deve permitir dar manutenção em Tags.
-   RF008 - O sistema deve permitir dar manutenção em Transações.
-   RF009 - O sistema deve permitir visualizar e pagar Faturas de Cartão de Crédito.
-   RF010 - O sistema deve permitir dar manutenção em Orçamentos.
-   RF011 - O sistema deve permitir dar manutenção em Metas.
-   RF012 - O sistema deve permitir dar manutenção em Lançamentos Favoritos.
-   RF013 - O sistema deve permitir anexar comprovantes às Transações.
-   RF014 - O sistema deve exibir um painel com indicadores e relatórios financeiros.
-   RF015 - O sistema deve emitir notificações ao usuário.

# Requisitos Não Funcionais

-   RNF001 - O sistema deve ser feito para plataforma mobile.
-   RNF002 - O sistema deve possuir um backend responsável pelas regras de negócio e pela persistência dos dados.
-   RNF003 - O banco de dados deve ser armazenado em nuvem.
-   RNF004 - Os valores monetários devem ser armazenados como números inteiros, em centavos, com precisão de 2 casas decimais na exibição.
-   RNF005 - A autenticação deve ser realizada por meio de token JWT.
-   RNF006 - As senhas devem ser armazenadas com algoritmo de hash irreversível.
-   RNF007 - A comunicação entre o aplicativo e o backend deve ocorrer por HTTPS.

# Regras de Negócio

## Usuários

-   RN001 - O cadastro do _Usuário_ deve conter o **nome**, o **e-mail** e a **senha**.
-   RN002 - O **e-mail** do _Usuário_ deve ser único no sistema.
-   RN003 - A **senha** do _Usuário_ deve conter no mínimo 8 caracteres.
-   RN004 - A autenticação do _Usuário_ é realizada por **e-mail** e **senha**, resultando na emissão de um **token de acesso** e de um **token de renovação**.
-   RN005 - O **token de acesso** possui prazo de expiração curto, exigindo renovação após o seu vencimento.
-   RN006 - O **token de renovação** possui prazo de expiração superior ao do **token de acesso** e permite a emissão de um novo **token de acesso** sem a informação das credenciais.
-   RN007 - O **token de renovação** é invalidado após a sua utilização, sendo emitido um novo **token de renovação** em conjunto com o novo **token de acesso**.
-   RN008 - O encerramento da sessão pelo _Usuário_ deve invalidar o **token de renovação** correspondente.
-   RN009 - A alteração da **senha** exige a informação da **senha** atual e deve invalidar os **tokens de renovação** ativos do _Usuário_.
-   RN010 - Todos os registros do sistema pertencem a um _Usuário_.
-   RN011 - O _Usuário_ só pode consultar e manipular os registros dos quais é dono.
-   RN012 - A exclusão do _Usuário_ é lógica, preservando os registros vinculados a ele.
-   RN013 - O _Usuário_ excluído não pode se autenticar e deve ter os seus **tokens de renovação** invalidados.
-   RN014 - O **e-mail** de um _Usuário_ excluído permanece indisponível para novos cadastros.

## Grupos de Contas

-   RN015 - Os _Grupos de Contas_ podem ser do **tipo** "Padrão" ou "Cartão de Crédito".
-   RN016 - O cadastro do _Grupo de Contas_ deve conter o **nome** e o **tipo** (Default: Padrão).
-   RN017 - O _Grupo de Contas_ não pode ser excluído quando possuir _Contas_ vinculadas.
-   RN085 - O _Grupo de Contas_ não pode ter o **tipo** alterado quando possuir _Contas_ vinculadas.

## Contas

-   RN018 - O cadastro da _Conta_ deve conter o **nome**, o **grupo** (referente à _Grupo de Contas_), o **saldo inicial** (Default: 0), o **ícone** e a **cor**.
-   RN019 - Quando a _Conta_ for de um **grupo** do **tipo** "Cartão de Crédito", deve-se informar o **limite**, o **dia de fechamento** e o **dia de vencimento**.
-   RN020 - O **dia de fechamento** e o **dia de vencimento** devem estar entre 1 e 31, sendo ajustados para o último dia do mês quando o mês não possuir o dia informado.
-   RN021 - O **saldo** de uma _Conta_ é o **saldo inicial** acrescido das _Transações_ efetivadas vinculadas a ela.
-   RN022 - _Contas_ de um **grupo** do **tipo** "Cartão de Crédito" não possuem **saldo**, sendo controladas por **limite** e _Faturas_.
-   RN023 - O **limite disponível** de uma _Conta_ do **tipo** "Cartão de Crédito" é o **limite** subtraído das _Faturas_ em aberto e dos lançamentos ainda não faturados.
-   RN024 - A _Conta_ não pode ser excluída quando possuir _Transações_ vinculadas, podendo ser arquivada.
-   RN025 - A _Conta_ arquivada não deve ser exibida para seleção em novos lançamentos, preservando o histórico existente.

## Cartões de Débito

-   RN026 - O _Cartão de Débito_ é um meio de pagamento vinculado a uma _Conta_ de um **grupo** do **tipo** "Padrão", não constituindo uma _Conta_.
-   RN027 - O cadastro do _Cartão de Débito_ deve conter o **nome** e a **conta vinculada**.
-   RN028 - A _Transação_ realizada por meio de um _Cartão de Débito_ afeta diretamente o **saldo** da **conta vinculada**.

## Categorias

-   RN029 - O cadastro de _Categorias_ deve conter o **nome**, a **natureza**, o **ícone** e a **cor**.
-   RN030 - A **natureza** da _Categoria_ pode ser "Receita", "Despesa" ou "Ambas".
-   RN031 - As _Categorias_ podem ser classificadas como subcategorias, sendo vinculadas à outra **categoria**.
-   RN032 - Uma _Categoria_ não pode ser subcategoria de outra subcategoria, nem ser movida para tornar-se subcategoria de uma subcategoria.
-   RN033 - A subcategoria deve possuir **natureza** compatível com a **categoria** à qual está vinculada.
-   RN034 - A _Categoria_ não pode ser excluída quando possuir _Transações_ ou subcategorias vinculadas, podendo ser arquivada.
-   RN035 - A _Categoria_ arquivada não deve ser exibida para seleção em novos lançamentos, preservando o histórico existente.
-   RN083 - A _Categoria_ arquivada pode ser desarquivada, voltando a ser exibida para seleção em novos lançamentos.
-   RN084 - A subcategoria de uma _Categoria_ arquivada não deve ser exibida para seleção em novos lançamentos, ainda que não esteja arquivada.

## Tags

-   RN036 - O cadastro de _Tags_ deve conter o **nome**.
-   RN037 - Uma _Transação_ pode possuir nenhuma ou várias _Tags_.
-   RN038 - As _Tags_ são independentes da hierarquia de _Categorias_.

## Transações

-   RN039 - As _Transações_ podem ser do **tipo** "Receita", "Despesa" ou "Transferência".
-   RN040 - Uma _Transação_ deve conter a **data**, o **valor**, **descrição** (opcional), **conta** (referente à _Conta_), o **tipo** e a **situação**.
-   RN041 - O **valor** da _Transação_ deve ser maior que zero, sendo o sinal derivado do **tipo**.
-   RN042 - As _Transações_ do **tipo** "Receita" e "Despesa" devem conter a **categoria** (referente à _Categoria_), cuja **natureza** deve ser compatível com o **tipo** da _Transação_.
-   RN043 - A _Transação_ do **tipo** "Transferência" não possui **categoria**.
-   RN044 - Quando a _Transação_ for do **tipo** "Transferência", deve-se informar a **conta de origem** (referente à _Conta_) e **conta de destino** (referente à _Conta_).
-   RN045 - A **conta de origem** e **conta de destino** de uma _Transação_ do **tipo** "Transferência" devem pertencer a um **grupo** do **tipo** "Padrão".
-   RN046 - A **conta de origem** e a **conta de destino** de uma _Transação_ do **tipo** "Transferência" não podem ser a mesma.
-   RN047 - As _Transações_ do **tipo** "Transferência" não compõem os totais de receita e despesa nos relatórios.
-   RN048 - A **situação** da _Transação_ pode ser "Prevista" ou "Efetivada".
-   RN049 - A _Transação_ com **data** futura é criada como "Prevista" e a _Transação_ com **data** igual ou anterior à atual é criada como "Efetivada", podendo o padrão ser configurado pelo usuário.
-   RN050 - Apenas as _Transações_ "Efetivadas" compõem o **saldo** da _Conta_; as _Transações_ "Previstas" compõem o **saldo projetado**.
-   RN051 - A _Transação_ pode conter **anexos**.
-   RN086 - A efetivação da _Transação_ só é permitida quando a sua **situação** for "Prevista", sendo rejeitada quando já estiver "Efetivada".
-   RN087 - A reversão da _Transação_ só é permitida quando a sua **situação** for "Efetivada", sendo rejeitada quando já estiver "Prevista".
-   RN088 - A efetivação da _Transação_ permite informar a **data** em que ela efetivamente ocorreu, atualizando a **data** da _Transação_.
-   RN089 - A alteração do **tipo** da _Transação_ de ou para "Transferência" não é permitida na edição, sendo necessário excluir e criar um novo lançamento.

## Faturas de Cartão de Crédito

-   RN052 - A _Transação_ lançada em uma _Conta_ do **tipo** "Cartão de Crédito" não afeta **saldo**, sendo atribuída a uma _Fatura_.
-   RN053 - A _Transação_ é atribuída à _Fatura_ cujo período de fechamento contém a sua **data**; lançamentos com **data** posterior ao **dia de fechamento** são atribuídos à _Fatura_ seguinte.
-   RN054 - A _Fatura_ deve conter o **período**, o **valor total** e a **data de vencimento**.
-   RN055 - A **situação** da _Fatura_ pode ser "Aberta", "Fechada", "Parcialmente Paga" ou "Paga".
-   RN056 - O **pagamento** da _Fatura_ é uma operação própria que debita uma _Conta_ de um **grupo** do **tipo** "Padrão" e abate o saldo devedor da _Fatura_, não constituindo uma _Transação_ do **tipo** "Transferência".
-   RN057 - A _Fatura_ admite **pagamento** parcial e **pagamento** antecipado.
-   RN058 - O estorno lançado em uma _Conta_ do **tipo** "Cartão de Crédito" abate o **valor total** da _Fatura_ correspondente.

## Repetição de Transações

-   RN059 - A _Transação_ pode ser marcada para repetir.
-   RN060 - A configuração da repetição da _Transação_ pode ser de dois **tipos**: "Padrão" ou "Parcelas".
-   RN061 - Quando a repetição da _Transação_ for do **tipo** "Padrão", deverá ser selecionada a frequência da repetição: "Diária", "Dias da Semana", "Fim de Semana", "Semanalmente", "A cada 2 semanas", "A cada 4 semanas", "Mensalmente", "Fim do mês", "A cada 2 meses", "A cada 3 meses", "A cada 4 meses", "A cada 6 meses", "Anualmente".
-   RN062 - A repetição do **tipo** "Padrão" é indefinida, admitindo **data final** opcional.
-   RN063 - As ocorrências da repetição do **tipo** "Padrão" devem ser geradas sob demanda, sendo persistidas apenas quando editadas ou efetivadas.
-   RN064 - Quando a repetição da _Transação_ for do **tipo** "Parcelas", deverá ser informada a **quantidade de parcelas** (mínimo de 2), gerando _Transações_ vinculadas e identificadas pelo número da parcela e pelo total.
-   RN065 - A diferença de arredondamento na divisão do **valor** entre as parcelas deve ser aplicada na primeira parcela.
-   RN066 - A edição e a exclusão de uma ocorrência de repetição devem permitir o escopo "Somente esta", "Esta e as futuras" ou "Todas".
-   RN067 - A ocorrência editada individualmente é tratada como exceção e não deve ser sobrescrita por alterações posteriores na série.
-   RN068 - As parcelas podem ser antecipadas, permitindo a quitação do valor restante.

## Orçamentos

-   RN069 - O cadastro do _Orçamento_ deve conter a **categoria** (referente à _Categoria_), o **período** e o **valor limite**.
-   RN070 - O consumo do _Orçamento_ corresponde às _Transações_ do **tipo** "Despesa" da **categoria** e de suas subcategorias dentro do **período**.
-   RN071 - As _Transações_ do **tipo** "Transferência" não consomem _Orçamento_.
-   RN072 - O _Orçamento_ deve gerar alerta ao atingir um percentual configurável do **valor limite** e ao ultrapassá-lo.

## Metas

-   RN073 - O cadastro da _Meta_ deve conter o **nome**, o **valor alvo**, a **data alvo** (opcional) e a **conta vinculada** (referente à _Conta_).
-   RN074 - O progresso da _Meta_ corresponde ao **saldo** da **conta vinculada** em relação ao **valor alvo**.

## Lançamentos Favoritos

-   RN075 - O _Lançamento Favorito_ armazena os dados pré-preenchidos de uma _Transação_ para registro rápido.
-   RN076 - A _Transação_ gerada a partir de um _Lançamento Favorito_ pode ser editada antes da confirmação.

## Painel e Relatórios

-   RN077 - O **saldo consolidado** corresponde à soma dos **saldos** das _Contas_ não arquivadas pertencentes a **grupos** do **tipo** "Padrão".
-   RN078 - O painel deve apresentar o **saldo consolidado**, o total de receitas e despesas do período, os gastos por _Categoria_ e a evolução mensal.
-   RN079 - A projeção de fluxo de caixa deve considerar as _Transações_ "Previstas" e as ocorrências futuras das repetições.

## Notificações

-   RN080 - O sistema deve notificar o usuário sobre o vencimento de _Faturas_.
-   RN081 - O sistema deve notificar o usuário sobre as _Transações_ "Previstas" do dia.
-   RN082 - O sistema deve notificar o usuário quando um _Orçamento_ atingir o percentual configurado ou for ultrapassado.
