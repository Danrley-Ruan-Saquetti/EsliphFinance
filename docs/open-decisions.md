# Decisões em Aberto

Pontos do domínio ainda **não decididos**. Enquanto um item estiver aqui, não existe regra de negócio sobre ele em `requirements.md` — e nada a seu respeito deve ser implementado.

Quando a decisão for tomada, o item sai deste arquivo e vira uma ou mais RNs em `requirements.md`. Os identificadores **DA0xx** não são reaproveitados.

## DA001 - Recuperação de senha

**Contexto**: O sistema não oferece a recuperação de senha ("esqueci minha senha"). A alteração da senha exige a informação da senha atual (RN009), de modo que o _Usuário_ que a perde fica sem acesso à sua conta e aos seus registros, sem caminho de retorno.

**Impacto**: RF002, RN009.

**Alternativas**:

1. Envio de um link de redefinição por e-mail, com token de uso único e prazo de expiração curto.
2. Envio de um código numérico por e-mail, informado pelo _Usuário_ no aplicativo.

**Recomendação do analista**: Link de redefinição por e-mail, invalidando os **tokens de renovação** ativos do _Usuário_ no momento da redefinição, pelo mesmo motivo que a RN009 já os invalida na troca de senha — a perda da senha é indistinguível de um comprometimento da conta.

**Situação**: Em stand by, aguardando a definição da estratégia de envio de e-mails.

## DA002 - Alteração da natureza de Categoria com lançamentos existentes

**Contexto**: A RN042 exige que a **natureza** da _Categoria_ seja compatível com o **tipo** da _Transação_ no momento do lançamento, mas nenhuma regra diz o que ocorre quando a **natureza** é alterada depois, deixando de suportar _Transações_ já existentes.

**Impacto**: RF006, RN030, RN033, RN042.

**Alternativas**:

1. Bloquear a alteração quando houver _Transações_ da **natureza** que deixaria de ser suportada.
2. Permitir a alteração, preservando as _Transações_ existentes e restringindo apenas os novos lançamentos.
3. Permitir apenas a ampliação para "Ambas", bloqueando qualquer restrição.

**Recomendação do analista**: Alternativa 1. A alternativa 2 deixa _Transações_ cuja **categoria** contradiz o seu **tipo**, o que quebra os gastos por _Categoria_ do painel (RN078) e qualquer total agrupado por **natureza**. A alternativa 3 é um caso particular da 1, mais restritivo sem ganho: ampliar nunca deixa lançamento órfão, e restringir é seguro quando não há lançamento incompatível.

**Situação**: Bloqueada até a existência do contexto de _Transações_, sem o qual a regra não é verificável.
