# Domínios

Um arquivo por contexto de `server/src/domain`, com o mapa técnico da fatia: os arquivos que a compõem, as regras que cada um garante, as fronteiras com os vizinhos e o que ainda não existe.

Estes documentos descrevem **o que está construído**. O que o produto **deve** fazer está em [`../requirements.md`](../requirements.md), e o que ainda não foi decidido em [`../open-decisions.md`](../open-decisions.md). Quando os dois divergem, o documento do domínio registra a divergência e aponta a RN contrariada — é um bug, não uma regra.

O que vale para o repositório inteiro — stack, camadas, comandos, contrato de erro, guard global, convenções de nomenclatura — está em [`../../server/CLAUDE.md`](../../server/CLAUDE.md) e não é repetido aqui.

A manutenção destes arquivos é da skill `domain-architect`: contexto novo em `src/domain/` nasce com o seu documento e com a sua linha nesta tabela.

## Implementados

| Domínio | Contexto | Requisitos | Estado |
| ------- | -------- | ---------- | ------ |
| [Usuários](user.md) | `src/domain/user` | RF001, RF002 · RN001–RN014 | Cadastro, login, renovação e encerramento de sessão, consulta e edição de perfil. Faltam alteração de senha (RN009) e exclusão lógica (RN012, RN013) |
| [Grupos de Contas](account-group.md) | `src/domain/account-group` | RF003 · RN015–RN017 | Cadastro, listagem com filtro por tipo e consulta individual. Faltam edição e exclusão bloqueada por contas (RN017) |
| [Contas](account.md) | `src/domain/account` | RF004 · RN018–RN025 | Cadastro nos dois tipos de grupo e listagem com saldo e limite. Faltam consulta individual, edição e arquivamento (RN024, RN025); saldo e limite dependem de _Transações_ e _Faturas_ |

`src/domain/example` (entidade `Note`) não é domínio real: é a fatia vertical de referência para criar um contexto novo, e sai quando deixar de ser útil.

## Como os contextos se ligam hoje

```mermaid
graph TD
  User[Usuários]
  AccountGroup[Grupos de Contas]
  Account[Contas]

  AccountGroup -->|ownerId| User
  Account -->|ownerId| User
  Account -->|accountGroupId, tipo do grupo| AccountGroup
```

As setas apontam para quem é conhecido. _Usuários_ não conhece ninguém; _Contas_ é o único que hoje lê outro domínio dentro de um caso de uso (`CreateAccountUseCase` injeta o `AccountGroupsRepository` para descobrir o tipo do grupo).

## Ainda sem contexto no código

Previstos nos requisitos e sem nenhuma linha escrita — cada um ganha o seu arquivo quando `src/domain/<contexto>` nascer:

Cartões de Débito (RF005) · Categorias (RF006) · Tags (RF007) · Transações (RF008) · Faturas (RF009) · Orçamentos (RF010) · Metas (RF011) · Lançamentos Favoritos (RF012) · Anexos (RF013) · Relatórios (RF014) · Notificações (RF015)

_Transações_ e _Faturas_ são as dependências que hoje travam o saldo real das contas (RN021) e o limite disponível dos cartões (RN023).
