# Requisitos Funcionais

-   RF001 - O sistema deve permitir dar manutenção em Grupos de Ativos.
-   RF002 - O sistema deve permitir dar manutenção em Ativos.
-   RF003 - O sistema deve permitir dar manutenção em Categorias.
-   RF004 - O sistema deve permitir dar manutenção em Transações.

# Requisitos Não Funcionais

-   RNF001 - O sistema deve ser feito para plataforma mobile.
-   RNF002 - O banco de dados deve ser armazenado localmente no dispositivo do usuário.

# Regras de Negócio

-   RN001 - Os _Grupos de Ativos_ podem ser do **tipo** "Padrão", "Cartão de Crédito" ou "Cartão de Débito".
-   RN002 - O cadastro do _Grupo de Ativo_ deve conter o **nome** e o **tipo** (Default: Padrão).

---

-   RN004 - O cadastro do _Ativo_ deve conter o **nome** e o **grupo** (referente à _Grupo de Ativo_).
-   RN005 - Quando o _Ativo_ for do **grupo** "Cartão de Crédito", deve-se informar a **data de fechamento** e **data de vencimento**.

---

-   RN006 - O cadastro de _Categorias_ deve conter o **nome**.
-   RN007 - As _Categorias_ podem ser classificadas como subcategorias, sendo vinculadas à outra **categoria**.
-   RN008 - Uma _Categoria_ não pode ser subcategoria de outra subcategoria.

---

-   RN009 - As _Transações_ podem ser do **tipo** "Receita", "Despesa" ou "Transferência".
-   RN010 - Uma _Transação_ deve conter a **data**, o **valor**, **descrição** (opcional), **categoria** (referente à Categoria), **conta** (referente à _Ativo_) e o **tipo**.
-   RN011 - Quando a _Transação_ for do **tipo** "Transferência", deve-se informar a **conta de origem** (referente à _Ativo_) e **conta de destino** (referente à _Ativo_).
-   RN012 - A **conta de origem** e **conta de destino** de uma _Transação_ do **tipo** "Transferência" deve ser do **tipo** "Padrão".
-   RN013 - A _Transação_ pode ser marcada para repetir.
-   RN014 - A configuração da repetição da _Transação_ pode ser de dois **tipos**: "Padrão" ou "Parcelas".
-   RN015 - Quando a repetição da _Transação_ for do **tipo** "Parcela", deverá ser selecionado a frequência da repetição: "Diária", "Dias da Semana", "Fim de Semana", "Semanalmente", "A cada 2 semanas", "A cada 4 semanas", "Mensalmente", "Fim do mês", "A cada 2 meses", "A cada 3 meses", "A cada 4 meses", "A cada 6 meses", "Anualmente".
