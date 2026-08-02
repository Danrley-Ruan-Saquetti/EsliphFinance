# Blocos de construção — `src/core`

> **Cobre** `server/src/core` · **Requisitos** RNF004 · RN065

`core/` é o que todo domínio herda e nenhum domínio possui: identidade, igualdade, retorno de caso de uso, erro base e dinheiro. Não há regra de negócio aqui, e nada de `core/` importa NestJS, Drizzle ou Zod.

## Identidade e igualdade

| Bloco | Contrato | O que é fácil errar |
| ----- | -------- | ------------------- |
| `UniqueEntityID` | Encapsula um UUID; sem argumento, gera um `randomUUID()`. `toString()`, `toValue()`, `equals(id)` | Comparar com `===` — são objetos distintos; use `equals` ou `toValue()` |
| `Entity<Props>` | Construtor `protected` (a criação passa por um factory estático da própria entidade), `props` protegido e mutável, `id` somente leitura. `equals` compara **identidade**, não conteúdo | Duas entidades com os mesmos dados e ids diferentes não são iguais — e é isso que se quer |
| `AggregateRoot<Props>` | `Entity` + fila de `domainEvents`, com `addDomainEvent` protegido e `clearDomainEvents` público | Os eventos ficam acumulados: **ninguém os despacha hoje** |
| `ValueObject<Props>` | Construtor `protected`, `props` `readonly`. `equals` compara **conteúdo**, via `JSON.stringify(props)` | A comparação é sensível à **ordem das chaves**: dois VOs com os mesmos valores em ordem diferente saem como diferentes. Monte os props sempre na mesma ordem |
| `DomainEvent` | Interface com `occurredAt` e `getAggregateId()` | Existe o contrato, não existe o mecanismo |

A escolha de fundo: entidade tem ciclo de vida e é igual a si mesma pelo id; Value Object é substituível e é igual pelo valor. Um campo que só faz sentido validado (dia de fechamento, cor, e-mail) é VO; o resto é propriedade da entidade.

## `Either` — o retorno dos casos de uso

`Either<L, R>` é `Left<L, R> | Right<L, R>`, construídos por `left(value)` e `right(value)`, com `isLeft()` e `isRight()` funcionando como type guards.

A regra que ele impõe: **erro esperado de negócio é valor de retorno, não exceção**. E-mail já em uso, registro não encontrado, credencial inválida — tudo isso volta em `left` e o chamador é obrigado pelo compilador a tratar antes de chegar ao valor de sucesso.

Exceção fica para duas coisas:

- **Invariante de domínio violada** — a entidade lança `InvariantError`, porque um objeto inválido não pode existir e não há chamador razoável para tratar isso.
- **Falha inesperada** — banco fora, bug.

No controller a distinção some: `if (result.isLeft()) throw result.value`, e o filtro global responde. Ver [`request-lifecycle.md`](request-lifecycle.md).

`UseCase<Request, Response>` é a interface correspondente: um único `execute(request)` assíncrono. Um caso de uso, um arquivo, uma responsabilidade.

## Erros

`BaseError` é abstrato, estende `Error`, exige um `code` estável em inglês e recebe a mensagem em português pronta para exibição. O `name` é preenchido pelo nome da subclasse.

| Erro | `code` | Mensagem padrão |
| ---- | ------ | --------------- |
| `InvariantError` | `INVARIANT_VIOLATION` | Sempre explícita no ponto em que é lançada |
| `ResourceNotFoundError` | `RESOURCE_NOT_FOUND` | `Registro não encontrado` |
| `NotAllowedError` | `NOT_ALLOWED` | `Operação não permitida` |

`ResourceNotFoundError` e `NotAllowedError` recebem a **frase inteira**, não um nome de recurso interpolado — `new ResourceNotFoundError('Conta não encontrada')`. É o que faz a concordância de gênero sair certa em português, e é por isso que a mensagem não é montada por template.

## `Money` — dinheiro (RNF004)

Todo valor monetário é **inteiro em centavos**, da entrada à persistência; as duas casas decimais existem só na exibição. `number` cru não circula representando dinheiro: quem o representa é `Money`, imutável, criado por `Money.fromCents(n)` ou `Money.zero()`. Qualquer coisa que não seja inteiro seguro — fracionário, `NaN`, infinito, além do inteiro seguro — lança `InvariantError`.

| Operação | Comportamento |
| -------- | ------------- |
| `add` / `subtract` | Devolvem um novo `Money`; valor negativo é válido (saldo devedor, estorno) |
| `multiply(factor)` | Aceita fator fracionário e arredonda para o centavo mais próximo **afastando-se do zero** (`166.5 → 167`, `-166.5 → -167`), em vez do arredondamento do `Math.round`, que empurraria o negativo para cima |
| `allocate(parts)` | Rateio em `parts` inteiras positivas; a diferença de arredondamento vai na **primeira** parte (RN065). A soma das partes é sempre igual ao total |
| `toString()` | Duas casas com ponto decimal (`123456 → "1234.56"`, `-5 → "-0.05"`) — sem símbolo de moeda e sem locale, que são decisão do cliente |

As três bordas onde `Money` entra e sai:

| Borda | Peça | Comportamento |
| ----- | ---- | ------------- |
| Entrada | `moneySchema` (`@infra/http/schemas/money-schema`) | Valida inteiro em centavos e **já transforma em `Money`**; compõe com o `ZodValidationPipe` como qualquer schema. Restrição adicional (positivo obrigatório, por exemplo) fica em quem usa o schema, não nele |
| Persistência | `moneyAmount(name)` (`@infra/database/drizzle/schemas/money-amount`) | `bigint` com `mode: 'number'`. Nenhum campo monetário usa `numeric`, `real` ou `double precision` |
| Saída | `MoneyPresenter` | `{ "amountInCents": 123456, "formatted": "1234.56" }` — sempre os dois campos, sempre com esses nomes. O cliente calcula sobre `amountInCents` e exibe `formatted` |

## Utilitários

`Optional<T, K>` torna opcionais as chaves `K` de `T`. É o que permite o factory de criação de uma entidade aceitar sem `createdAt`, `id` e afins, preenchendo-os por dentro.

## Ainda não existe

| Ausente | Consequência |
| ------- | ------------ |
| Despacho de eventos de domínio | `AggregateRoot` acumula, nada publica; feature que dependa de reação a evento não tem por onde começar |
| Value Object de moeda (currency) | `Money` é sempre a mesma moeda implícita; multimoeda exigiria mudar o VO e a coluna |
| `Either` com utilitários de composição (`map`, `chain`) | Encadear casos de uso é feito na mão, com `isLeft()` |
