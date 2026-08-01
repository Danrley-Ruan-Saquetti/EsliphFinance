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
