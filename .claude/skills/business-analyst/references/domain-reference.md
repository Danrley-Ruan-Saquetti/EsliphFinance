# Referência de Domínio — Finanças Pessoais e Investimento

Base para fundamentar recomendações quando `docs/requirements.md` é silencioso. Aqui está a prática do setor e o vocabulário correto; a especificação do EsliphFinance está no documento de requisitos, e onde os dois divergirem, o documento vence — o que existe aqui é insumo para propor mudança, não regra em vigor.

## Índice

1. [Quem é o usuário](#1-quem-é-o-usuário)
2. [Vocabulário do controle financeiro](#2-vocabulário-do-controle-financeiro)
3. [Cartão de crédito no Brasil](#3-cartão-de-crédito-no-brasil)
4. [Orçamento](#4-orçamento)
5. [Metas e reservas](#5-metas-e-reservas)
6. [Indicadores e relatórios](#6-indicadores-e-relatórios)
7. [Investimentos](#7-investimentos)
8. [O que os concorrentes fazem](#8-o-que-os-concorrentes-fazem)
9. [Armadilhas recorrentes](#9-armadilhas-recorrentes)

---

## 1. Quem é o usuário

Uma pessoa física controlando o próprio dinheiro pelo celular. Três verdades sobre ela pautam quase toda decisão de produto:

- **Ela abandona.** A causa número um de morte de um app de finanças é o lançamento manual. Toda regra que adiciona um campo obrigatório ou uma etapa a mais no registro de uma despesa cobra um preço alto e precisa se justificar.
- **Ela não é contadora.** Termos como "partida dobrada", "competência", "conciliação" não podem aparecer na tela. O modelo pode ser rigoroso por dentro; a linguagem, não.
- **Ela quer duas respostas.** "Quanto eu tenho?" e "posso gastar isso?". Todo indicador que não ajuda numa dessas duas é secundário, por mais interessante que seja.

Uma consequência prática: quando houver escolha entre precisão contábil e simplicidade, o app de finanças pessoais escolhe simplicidade, e compensa com boa apresentação. É por isso que quase nenhum deles implementa partida dobrada de verdade — usam receita/despesa/transferência, que é uma partida dobrada disfarçada de linguagem humana.

## 2. Vocabulário do controle financeiro

**Regime de caixa vs. competência.** Caixa: o lançamento conta quando o dinheiro sai ou entra da conta. Competência: conta quando o fato acontece, independentemente do pagamento. Finanças pessoais opera em **caixa**, com a exceção estruturante do cartão de crédito — a compra acontece hoje, o dinheiro sai na fatura. É daí que nasce toda a complexidade de fatura, e é por isso que "gastei R$ 300 hoje" e "saiu R$ 300 da conta hoje" são coisas diferentes.

**Saldo vs. saldo projetado.** Saldo é o dinheiro que existe agora (só lançamentos efetivados). Projetado inclui o que está previsto até uma data. Confundir os dois é o erro que faz o usuário gastar dinheiro que não tem.

**Efetivado vs. previsto** (também chamado de "pago/pendente" ou "confirmado/agendado"). Um lançamento previsto é uma intenção; ele vira efetivado quando o dinheiro se move. Apps sérios permitem efetivar em lote e efetivar com data diferente da prevista.

**Receita, despesa, transferência.** As duas primeiras mudam o patrimônio; a transferência apenas move dinheiro entre contas do mesmo dono e **não é nem receita nem despesa**. Tratar transferência como despesa na conta de origem e receita na de destino é o erro clássico que dobra artificialmente os totais do mês.

**Categoria vs. tag.** Categoria responde "que tipo de gasto é este?" e é hierárquica, exclusiva e obrigatória — é a espinha do relatório. Tag responde "a que contexto isto pertence?" (viagem, reforma, trabalho), é livre, múltipla e opcional, e serve para cortes transversais que a hierarquia não dá. Misturar os dois papéis produz ou uma árvore de categorias explosiva ou relatórios que não somam.

**Conciliação.** Comparar o que está no app com o extrato real do banco e resolver as diferenças. Em app manual, é o momento em que o usuário descobre o que esqueceu de lançar. Um "ajuste de saldo" (lançamento que força o saldo a bater com o extrato) é a ferramenta padrão para isso — e é uma lacuna comum em produtos jovens.

**Estorno.** Devolução de um valor já lançado. Não é uma receita: é a anulação, total ou parcial, de uma despesa anterior. Registrado como receita, ele infla receita e despesa do mês e distorce a taxa de poupança.

## 3. Cartão de crédito no Brasil

A peça mais difícil de modelar do domínio, e onde os usuários mais reclamam de erro.

**Fechamento e vencimento.** O cartão tem um dia de fechamento (quando a fatura para de receber compras) e um dia de vencimento (quando precisa ser paga), normalmente com 7 a 10 dias entre eles. Uma compra feita depois do fechamento cai na fatura do mês seguinte — daí a expressão "melhor dia de compra", que é o dia seguinte ao fechamento: o prazo máximo até o pagamento.

**Fatura não é conta.** A conta de cartão não tem saldo; tem **limite** e faturas. O que o usuário quer ver ali é o limite disponível e o valor da fatura aberta, nunca um saldo negativo — que é como o produto errado apresenta e como o usuário não pensa.

**Pagamento da fatura.** Debita uma conta corrente e abate a dívida da fatura. Não é uma transferência entre contas do usuário nem uma despesa: a despesa já foi registrada na compra. Contar de novo no pagamento é a duplicação clássica.

**Pagamento parcial e rotativo.** Pagar menos que o total é permitido; o restante entra no crédito rotativo com juros altíssimos, e vira uma cobrança na fatura seguinte. Muitos apps ignoram isso e ficam devendo a explicação de por que a fatura seguinte não bate.

**Compra parcelada.** O valor total é dividido em N parcelas que caem em N faturas consecutivas. A divisão que não fecha (100 ÷ 3) sobra centavos, e a convenção do mercado é jogar a diferença na primeira parcela. Antecipar parcelas quita o valor restante — algumas operadoras dão desconto, e isso é uma decisão de escopo, não uma obviedade.

**Compra internacional.** Convertida pela cotação do dia do fechamento, com IOF. Fonte constante de divergência entre o valor lançado e o valor da fatura — o tratamento honesto é permitir ajustar o lançamento quando a fatura fecha.

**Cartão adicional.** Compartilha limite e fatura com o titular. Se o produto quiser distinguir quem gastou, isso é um atributo do lançamento, não uma conta separada.

## 4. Orçamento

**Métodos correntes:**

| Método               | Como funciona                                                                                              | Para quem                                                 |
| -------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **Por categoria**    | Um teto de gasto por categoria por período.                                                                | O padrão do mercado; simples e suficiente para a maioria. |
| **50-30-20**         | 50% necessidades, 30% desejos, 20% poupança/dívida.                                                        | Quem quer uma régua pronta sem configurar nada.           |
| **Envelope**         | O dinheiro é distribuído em envelopes antes de ser gasto; acabou o envelope, acabou o gasto.               | Quem tem dificuldade de autocontrole.                     |
| **Base zero (YNAB)** | Todo real recebido recebe uma função antes de ser gasto; o orçamento é do dinheiro que existe, não do mês. | Perfil disciplinado; a curva de aprendizado é real.       |

**Decisões que todo orçamento cobra:**

- **Período**: mensal é o padrão, mas o mês do orçamento nem sempre é o mês do calendário — quem recebe dia 5 pensa em ciclos de dia 5 a dia 4.
- **Sobra e estouro (rollover)**: o que sobrou passa para o próximo período? O YNAB diz sim, o mercado brasileiro majoritariamente diz não. É uma decisão de produto, não uma consequência técnica.
- **Escopo do consumo**: subcategorias consomem o orçamento da categoria pai (quase sempre sim). Transferência não consome (sempre). Despesa prevista consome ou só a efetivada? Se só a efetivada, o alerta chega tarde; se ambas, o valor consumido oscila quando a previsão muda.
- **Alerta**: o padrão é avisar em ~80% e no estouro. Alerta que chega quando o dinheiro já acabou não é alerta, é relatório.

## 5. Metas e reservas

Meta é um objetivo de acúmulo com valor alvo e, opcionalmente, data alvo. Duas modelagens competem:

- **Meta vinculada a uma conta** (o progresso é o saldo daquela conta): simples, honesta, e obriga o usuário a ter uma conta por meta. É o modelo do EsliphFinance hoje (RN073, RN074).
- **Meta como reserva virtual** (o usuário "aloca" parte do saldo de uma conta): flexível, permite várias metas numa conta só, e cobra o conceito de saldo alocado vs. livre — que é exatamente o tipo de conceito que o usuário comum não entende.

A **reserva de emergência** (3 a 6 meses de despesas, em liquidez diária) é a meta que todo material de educação financeira recomenda primeiro. Um produto que calcula automaticamente esse alvo a partir da média de despesas do usuário entrega valor real sem pedir nada em troca.

## 6. Indicadores e relatórios

Os que os usuários efetivamente usam, em ordem de importância:

1. **Saldo consolidado** — quanto eu tenho, somando as contas. Cartão de crédito fica de fora; conta arquivada também.
2. **Receitas × despesas do período** — o resultado do mês. Transferência não entra.
3. **Gastos por categoria** — para onde foi o dinheiro. Costuma ser o gráfico mais olhado do app.
4. **Evolução mensal** — a mesma comparação ao longo do tempo, que é onde a tendência aparece.
5. **Fluxo de caixa projetado** — saldo futuro considerando previstos e repetições. É a resposta para "posso gastar isso?".
6. **Taxa de poupança** — (receita − despesa) ÷ receita. O indicador mais honesto de saúde financeira e o mais ausente dos produtos.
7. **Evolução patrimonial** — só faz sentido quando existem investimentos; é a soma de contas mais posições.

Regra transversal: **todo relatório precisa dizer o que exclui**. Transferência, conta arquivada, lançamento previsto e fatura não paga são as quatro exclusões que mudam o número, e o usuário que não sabe qual está valendo desconfia do app inteiro.

## 7. Investimentos

Quando o produto passar a suportar investimentos, quase todo instinto vindo de conta corrente falha. As diferenças estruturais:

**O saldo não é a soma dos lançamentos.** Numa conta corrente, saldo = saldo inicial + lançamentos. Numa posição de investimento, o valor é **quantidade × cotação atual** — muda todo dia sem que nada seja lançado. Uma regra como a RN021 simplesmente não se aplica, e tentar forçá-la produz um saldo errado por construção.

**Aporte e resgate não são receita e despesa.** Aportar é mover dinheiro da conta corrente para o investimento; o patrimônio não muda. Classificar aporte como despesa é o erro mais comum e ele destrói a taxa de poupança justamente de quem está poupando. Aporte e resgate são **transferências**; o que é receita é o **rendimento**.

**Rendimento vs. valorização.** Rendimento é o que o ativo paga (juros, dividendos, aluguel de FII) e cai como dinheiro. Valorização é a mudança de preço da posição, que só vira dinheiro no resgate. Os dois compõem a rentabilidade, mas só o primeiro é caixa — e misturar os dois faz o usuário achar que "ganhou" um dinheiro que não pode gastar.

**Vocabulário mínimo:**

| Termo                     | Significado                                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Aporte / resgate**      | Entrada e saída de dinheiro do investimento.                                                                      |
| **Posição**               | Quanto se tem de um ativo (quantidade e valor atual).                                                             |
| **Custódia**              | Onde o ativo está guardado (a corretora). O equivalente à "conta" no mundo de investimento.                       |
| **Preço médio**           | Custo médio de aquisição; base para calcular o ganho.                                                             |
| **Marcação a mercado**    | Avaliar a posição pelo preço de hoje, não pelo de compra.                                                         |
| **Liquidez**              | Em quanto tempo vira dinheiro (D+0, D+1, D+30, no vencimento).                                                    |
| **Rentabilidade**         | Ganho percentual no período; se comparada ao CDI, expressa como "110% do CDI".                                    |
| **Renda fixa / variável** | Retorno previsível (CDB, Tesouro, LCI) vs. oscilante (ações, FII, cripto).                                        |
| **CDI / Selic / IPCA**    | Os índices de referência: o primeiro para renda fixa privada, o segundo para o Tesouro, o terceiro para inflação. |

**Tributação** (relevante para o produto, e onde a precisão importa): renda fixa segue tabela regressiva de IR (22,5% a 15%, conforme o prazo), com IOF nos primeiros 30 dias; ações têm isenção até certo volume mensal de vendas e alíquota sobre o ganho; FIIs têm rendimento isento e ganho de capital tributado. Um app que exibe rentabilidade **bruta** sem dizer que é bruta está enganando o usuário — e implementar cálculo de IR é escopo grande, que merece ser uma decisão explícita e não um efeito colateral.

**Consequência de modelagem**: uma conta de investimento provavelmente não é uma _Conta_ como as outras, do mesmo jeito que cartão de crédito não é. O padrão que funciona é um **tipo de grupo próprio**, com posições em vez de saldo, entrando no patrimônio mas ficando fora do saldo consolidado — porque o usuário que pergunta "quanto eu tenho?" não está contando o dinheiro preso no Tesouro 2035.

## 8. O que os concorrentes fazem

Referências para calibrar expectativa. Divergir é legítimo; divergir sem saber, não.

- **Mobills** (BR, líder de mercado): categorias hierárquicas, cartão de crédito bem resolvido com fatura e melhor dia de compra, orçamento por categoria com alerta, metas. O que os usuários mais elogiam é a fatura; o que mais reclamam é lançamento manual.
- **Organizze** (BR): mais simples e mais rápido de lançar, foco em fluxo de caixa e previsão. Prova que dá para ganhar mercado cortando funcionalidade em favor de velocidade de registro.
- **YNAB** (EUA): orçamento base zero, filosofia forte, curva de aprendizado alta e usuários fiéis. A referência de como fazer um método opinativo funcionar.
- **Wallet / Money Manager**: bons em relatório e multi-conta, fracos em cartão de crédito brasileiro — a lógica de fechamento/vencimento é uma peculiaridade local que produto estrangeiro erra.

Duas lições transversais: **importação automática (Open Finance) é o divisor de águas** de retenção — o produto que só tem lançamento manual compete em outro campeonato, e vale saber disso ao priorizar. E **quase todos falham em investimento**, tratando-o como uma conta comum — o que é justamente a oportunidade de um produto que se leve a sério nesse tema.

## 9. Armadilhas recorrentes

Cada uma destas já quebrou produto de verdade. Ao propor regra que toque nos temas, verifique explicitamente:

- **Contagem dupla da despesa** — na compra do cartão e de novo no pagamento da fatura.
- **Transferência virando receita e despesa** — infla os dois totais do mês e destrói a taxa de poupança.
- **Aporte virando despesa** — mesma família do anterior, e pune quem poupa.
- **Estorno virando receita** — infla receita e despesa simultaneamente.
- **Centavo perdido no parcelamento** — a soma das parcelas tem que bater com o total, sempre.
- **Float em dinheiro** — 0,1 + 0,2 ≠ 0,3. Inteiro em centavos, sem exceção.
- **Dia que não existe no mês** — vencimento dia 31 em fevereiro; a convenção é o último dia do mês.
- **Fuso horário na data do lançamento** — uma despesa lançada às 22h vira do dia seguinte em UTC e migra de mês, de fatura e de orçamento.
- **Alteração retroativa** — mudar a data ou o valor de um lançamento antigo remexe saldo, fatura fechada, orçamento consumido e relatório já visto. Toda regra de edição precisa dizer até onde o passado é editável.
- **Saldo negativo em conta corrente** — acontece (cheque especial) e o app precisa exibir sem parecer defeito.
- **Regra que só o autor entende** — se você precisou de dois parágrafos para explicar a interação entre duas regras novas, o usuário nunca vai entender. Simplifique antes de escrever.

