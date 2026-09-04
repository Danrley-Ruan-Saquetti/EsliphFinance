---
name: spec-writer
description: Como escrever e manter os testes automatizados do EsliphFinance com Vitest — unitários espelhados em `server/test/units`, ancorados nas RNs de `docs/requirements/`, cobrindo edge cases com meta de 100%, e e2e espelhados em `server/test/e2e`, enxutos, só de comunicação HTTP. Use SEMPRE que criar, alterar ou revisar qualquer código de `server/src`: todo use-case, entidade, value object, mapper, presenter, pipe, controller ou schema Zod entra com o teste que o cobre, mesmo que o pedido não fale em teste ("implementa o use-case X", "adiciona esse campo na entidade", "corrige esse bug"). Também vale quando o pedido mencionar teste, spec, Vitest, cobertura, coverage, mock, stub, factory, TDD, e2e, "o teste quebrou" ou "por que isso não está coberto".
---

# Spec Writer — EsliphFinance

O teste aqui não é uma rede de segurança opcional escrita depois: ele é a forma executável de `docs/requirements/`. As RNs são a especificação do produto, e o único lugar onde elas viram algo verificável é o nome e o corpo de um `it(...)`. É por isso que a regra prática deste projeto é **a implementação serve ao teste**, e não o contrário — quando os dois discordam, a suspeita recai primeiro sobre a implementação.

## Fronteira

**Território** — define **o que** deste repositório precisa de teste, **onde** o arquivo mora, **qual forma** ele tem e **quais casos** ele precisa cobrir. Arbitra a fronteira entre unitário e e2e, e o que fazer quando o teste e a implementação discordam.

**Fora da fronteira** — qual é a regra que o teste prova (ela está escrita em `docs/requirements/`, e não se decide aqui); o padrão de escrita e formatação do código, que vale integralmente dentro dos arquivos de teste mas é normatizado em outro lugar; como a suíte é executada nesta máquina; e a avaliação de código já escrito.

**O que não preciso saber** — como o comando de teste chega ao container, e por que a arquitetura transversal é como é. Nenhum dos dois muda um `it(...)`. O que precisa ser sabido sobre a estrutura de `src/` já está no espelhamento de caminho, que é mecânico.

**Contrato de borda** — recebo um arquivo de `server/src` criado ou alterado, com a RN que ele implementa. Entrego o spec espelhado, com a citação da RN no nome do `it(...)` — que é o único rastro entre `docs/requirements/` e a linha implementada, já que o código de produção não leva comentário.

**Dependência dura** — `docs/requirements/`. Um teste sem regra escrita por trás é uma regra inventada em silêncio; sem esse arquivo, esta skill produz especificação de fato que ninguém aprovou.

## A pirâmide deste projeto

| Camada        | Peso                    | Papel                                                                         |
| ------------- | ----------------------- | ----------------------------------------------------------------------------- |
| **Unitários** | A esmagadora maioria    | Onde as regras de negócio são provadas. Sem Docker, sem Nest, sem banco.       |
| **E2E**       | Poucos e triviais       | Provam apenas que a conversa HTTP ↔ Nest ↔ banco acontece. Nenhuma regra aqui. |

A divisão não é estética. Unitário roda em milissegundos, isola a causa da falha em um arquivo e permite cobrir dezenas de edge cases sem custo. E2E sobe a aplicação inteira: é caro, é lento e, quando quebra, não diz onde. Toda regra de negócio testada por e2e é uma regra testada no lugar errado — mova-a para o unitário do use-case ou da entidade e deixe no e2e só o status code.

## Onde o arquivo mora

Os dois tipos de teste espelham o caminho do arquivo que provam, cada um sob a sua raiz:

```
src/domain/example/application/use-cases/create-note.ts
  → test/units/domain/example/application/use-cases/create-note.spec.ts

src/infra/http/controllers/get-note.controller.ts
  → test/e2e/infra/http/controllers/get-note.controller.e2e-spec.ts
```

- **Unitário**: `test/units/` + **o mesmo caminho do arquivo em `src/`**, com sufixo `.spec.ts`. O espelhamento não é burocracia — é o que torna possível olhar um arquivo de `src` e saber, sem procurar, se ele tem teste.
- **E2E**: `test/e2e/` + **o mesmo caminho do arquivo em `src/`**, com sufixo `.e2e-spec.ts`. Na prática o arquivo espelhado quase sempre é um controller, já que é ele quem expõe a rota — mas isso é consequência, não obrigação. O critério é qual arquivo de `src/` o teste prova estar integrado; se um dia um e2e existir para provar outra borda (um job agendado, um consumidor de fila), ele espelha o caminho desse arquivo.
- **Factories**: `test/factories/make-<entidade>.ts`.
- Nada de `*.spec.ts` dentro de `src/`. As duas configs (`vitest.config.js` e `vitest.config.e2e.js`) coletam só `test/units/**/*.spec.ts` e `test/e2e/**/*.e2e-spec.ts`; um arquivo fora desses padrões — inclusive um `.e2e-spec.ts` solto na raiz de `test/` — **não roda por ninguém** e passa despercebido para sempre.
- Imports por alias: `@core`, `@domain`, `@infra` para produção, `@tests/factories/...` para as factories.

## O padrão único

Todo spec tem a mesma forma. A consistência importa porque quem lê um spec já sabe onde olhar, e porque um spec que foge do padrão costuma estar escondendo um problema de design no código testado.

```ts
import { beforeEach, describe, expect, it } from 'vitest'

import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { NotAllowedError } from '@core/errors/not-allowed-error'
import { GetNoteUseCase } from '@domain/example/application/use-cases/get-note'
import { InMemoryNotesRepository } from '@infra/database/in-memory/in-memory-notes-repository'
import { makeNote } from '@tests/factories/make-note'

let notesRepository: InMemoryNotesRepository
let sut: GetNoteUseCase

describe('Consultar nota', () => {
  beforeEach(() => {
    notesRepository = new InMemoryNotesRepository()
    sut = new GetNoteUseCase(notesRepository)
  })

  it('deve retornar a nota do próprio dono', async () => {
    const ownerId = new UniqueEntityID()
    const note = makeNote({ ownerId })

    await notesRepository.create(note)

    const result = await sut.execute({ noteId: note.id.toString(), ownerId: ownerId.toString() })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.note.title).toBe(note.title)
    }
  })

  it('deve retornar NotAllowedError quando a nota é de outro usuário (RN-0010, RN-0011)', async () => {
    const note = makeNote()

    await notesRepository.create(note)

    const result = await sut.execute({ noteId: note.id.toString(), ownerId: new UniqueEntityID().toString() })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(NotAllowedError)
    }
  })
})
```

Os elementos, um a um:

**Imports**: `vitest` (e demais externos) primeiro, linha em branco, depois os internos por alias em ordem alfabética. Importe `describe`/`it`/`expect` explicitamente mesmo com `globals: true` ligado — o import é o que faz o editor e o `tsc` enxergarem os tipos.

**`sut` e as dependências em `let` no escopo do módulo**, declarados antes do `describe`. `sut` é _system under test_ e é o único apelido aceito no projeto.

**`beforeEach` monta tudo do zero.** Estado compartilhado entre testes é a origem clássica do "passa sozinho, falha na suíte". Nunca instancie o SUT fora do `beforeEach`.

**`describe` nomeia o artefato sob teste**: caso de uso pela ação em português (`'Criar transação'`, `'Pagar fatura'`); entidade, VO, schema, pipe e presenter pelo identificador em inglês (`'Money'`, `'envSchema'`, `'ZodValidationPipe'`).

**`it` descreve o comportamento, não o código**, no formato:

```
deve <resultado esperado> quando <condição> (RN-00xx)
```

A condição só aparece quando distingue este caso dos outros — no caminho feliz óbvio, `'deve criar a nota e persisti-la no repositório'` basta. A citação da RN é obrigatória sempre que o teste prova uma regra de negócio, e vai no fim, entre parênteses, separando múltiplas por vírgula. É a única referência ao requisito que o projeto aceita: no código de produção não há comentário, então **o nome do teste é o rastro entre `docs/requirements/` e a linha implementada** — e é um rastro que quebra sozinho quando a regra muda.

**Corpo em três blocos separados por linha em branco**: montar o cenário, executar o SUT, verificar. Sem os rótulos `// arrange`, `// act`, `// assert` — comentário é proibido no repositório, e a separação em branco já comunica.

**Um comportamento por `it`.** Vários `expect` sobre o mesmo resultado são bem-vindos; dois cenários diferentes no mesmo `it` não, porque o primeiro a falhar esconde o segundo.

### Asserção de `Either`

Use-case devolve `Either`, então verifique o lado e depois o conteúdo, dentro do `if` que estreita o tipo:

```ts
expect(result.isLeft()).toBe(true)
if (result.isLeft()) {
  expect(result.value).toBeInstanceOf(ResourceNotFoundError)
}
```

Verificar só `isLeft()` deixa passar o erro errado — um `NotAllowedError` no lugar de um `ResourceNotFoundError` vira 403 em vez de 404 na borda HTTP. **Sempre asserte a classe do erro.**

Invariante de domínio é exceção, não `Either`, e se testa com `toThrow`:

```ts
expect(() => Note.create({ ownerId, title: '   ', content: 'Conteúdo' })).toThrow(InvariantError)
```

### Efeito colateral também é resultado

Um `result.isRight()` verdadeiro não prova que a coisa aconteceu. Verifique o estado do repositório in-memory:

```ts
expect(notesRepository.items).toHaveLength(1)
expect(notesRepository.items[0].ownerId.toString()).toBe(ownerId)
```

Isso vale principalmente para saldo (RN-0021), consumo de orçamento (RN-0070), atribuição de lançamento à fatura (RN-0053) e geração de parcelas (RN-0064) — casos em que o retorno é trivial e o efeito é toda a regra.

## Factories

Toda entidade ganha uma factory em `test/factories/make-<entidade>.ts`:

```ts
import { UniqueEntityID } from '@core/entities/unique-entity-id'
import { Note, NoteProps } from '@domain/example/enterprise/entities/note'

export function makeNote(override: Partial<NoteProps> = {}, id?: UniqueEntityID): Note {
  return Note.create({ ownerId: new UniqueEntityID(), title: 'Título', content: 'Conteúdo', ...override }, id)
}
```

Assinatura sempre `(override = {}, id?)`, com defaults válidos para todos os campos obrigatórios. O ganho não é economizar linhas: é que **o spec passa a mostrar apenas o que importa para a regra**. `makeTransaction({ amount: 1 })` diz que o teste é sobre o valor; a mesma coisa escrita à mão enterra o `amount` no meio de oito campos irrelevantes. E quando a entidade ganhar um campo obrigatório novo, um arquivo muda em vez de quarenta.

Duas exceções: no spec **da própria entidade**, chame `Entidade.create(...)` direto — a construção é o que está sob teste, e escondê-la atrás da factory testaria a factory. E quando o teste depende de um valor específico, passe-o no override em vez de confiar no default; um teste que quebra ao mudar o default da factory estava lendo o default sem querer.

## Cobertura

**A meta é 100% dos arquivos testáveis, com edge cases** — não porcentagem por porcentagem, mas porque uma linha nunca executada é uma linha cuja RN nunca foi verificada. O `vitest.config.js` reprova abaixo de **85%**: esse é o piso automático que impede a regressão silenciosa, e não o alvo. Chegar em 86% e parar é ler o número errado.

Ficam fora da conta (`coverage.exclude`) só os arquivos sem lógica própria ou acoplados a serviço externo, cobertos pelos e2e:

| Excluído                                          | Por quê                                                       |
| ------------------------------------------------- | ------------------------------------------------------------- |
| `src/main.ts`, `src/**/*.module.ts`               | Bootstrap e wiring do Nest — configuração, não comportamento.  |
| `src/infra/database/drizzle/drizzle.service.ts`   | Dono do pool `pg`; testá-lo é testar o driver.                 |
| `src/infra/database/drizzle/repositories/**`      | SQL real contra o Postgres — território dos e2e.               |
| `src/infra/database/drizzle/schemas/**`           | Declaração de tabela, fonte das migrations.                    |
| `src/infra/database/in-memory/**`                 | Test double; contá-lo inflaria a cobertura sem provar nada.    |

Tudo o mais é testável sem infraestrutura e entra na conta — inclusive **mappers** (tradução pura registro ↔ entidade, incluindo os campos nulos), **presenters**, **pipes**, **schemas Zod** e **controllers** (instancie a classe com um stub do use-case e verifique a tradução de `Either` para status HTTP; é onde 404 e 403 se separam).

Depois de escrever, confira o arquivo na tabela do relatório de cobertura — não a média geral. A média esconde exatamente o arquivo novo que ficou de fora.

## Encontrar os edge cases

Cobrir 100% das linhas com um caso feliz por método é fácil e quase inútil. O que faz o teste valer é o segundo e o terceiro caso. Este domínio é financeiro e tem armadilhas recorrentes — passe por esta lista ao escrever qualquer spec:

- **Limites numéricos**: o valor exato do limite, um abaixo e um acima. Senha com 7, 8 e 9 caracteres (RN-0003); valor zero e negativo (RN-0041); 1, 2 e 31 parcelas (RN-0064); dias 0, 1, 31 e 32 (RN-0020).
- **Datas que não existem**: dia 31 em fevereiro, fechamento e vencimento ajustados para o último dia do mês (RN-0020). Data passada, hoje e futura mudam a situação da transação (RN-0049) — congele o relógio com `vi.useFakeTimers()` e `vi.setSystemTime(...)` em vez de calcular a partir de `new Date()`, senão o teste falha em um dia específico do mês.
- **Dinheiro que não divide**: parcelar 100 em 3 (RN-0065 manda a sobra na primeira parcela). Some as parcelas e compare com o total — é a asserção que pega o centavo perdido. Sempre inteiro em centavos (RNF-0004), nunca `float`.
- **Propriedade do registro**: para todo use-case que lê ou altera algo, existe o caso "o registro é de outro usuário" → `NotAllowedError` (RN-0010, RN-0011). Este é o teste mais esquecido do projeto e o de maior impacto.
- **Vínculos que bloqueiam exclusão**: grupo com contas (RN-0017), conta com transações (RN-0024), categoria com transações ou subcategorias (RN-0034) — e a alternativa de arquivar. Exclusão de usuário é lógica (RN-0012), e o e-mail continua indisponível depois (RN-0014).
- **Compatibilidade**: natureza da categoria × tipo da transação (RN-0042), subcategoria × categoria pai (RN-0033), profundidade de dois níveis (RN-0032), grupo "Padrão" nas pontas da transferência (RN-0045) e contas iguais (RN-0046).
- **Exclusões de agregação**: transferência não entra em receita/despesa (RN-0047) nem consome orçamento (RN-0071); só transação efetivada compõe saldo (RN-0050); só conta não arquivada entra no saldo consolidado (RN-0077).
- **Coleção vazia e ausência**: listar sem nenhum registro, buscar id inexistente, campo opcional ausente e `null` — não são a mesma coisa no mapper.
- **Idempotência e estado repetido**: pagar fatura já paga, arquivar o que já está arquivado, usar duas vezes o token de renovação (RN-0007).

Quando o comportamento não estiver em nenhuma RN, **pare e declare a lacuna** — uma regra chutada dentro de um teste vira especificação de fato sem ninguém ter decidido nada, e o nome do `it(...)` é o que a torna permanente. O que falta aí é uma decisão de domínio: ou a regra existe e precisa ser localizada em `docs/requirements/`, ou não existe e precisa ser decidida e registrada antes do teste. Nenhuma das duas se resolve escrevendo o spec. E um ponto que já está em `docs/open-decisions.md` como **DA-00xx** não tem regra: ele não ganha teste.

## E2E: só a comunicação

Um e2e prova que a rota existe, que o corpo é validado, que a resposta tem o formato combinado e que os dados chegam ao Postgres. Nada além disso.

Por rota, o conjunto suficiente:

- o caminho feliz, verificando status e o shape da resposta;
- um corpo inválido → 400 pelo `ZodValidationPipe`;
- os demais status que a rota traduz (404, 403), **um caso cada**.

O que **não** entra no e2e: variação de regra de negócio, cálculo, edge case de data, permutação de campos. Se você está prestes a escrever o quarto e quinto cenário de negócio em um e2e, o teste que falta é unitário.

**Um arquivo de e2e por arquivo de `src/` espelhado**, e não um por recurso: `create-note.controller.e2e-spec.ts` e `get-note.controller.e2e-spec.ts` são arquivos separados, ainda que ambos batam em `/notes`. Um spec que cobre dois controllers deixa de ter caminho espelhado e volta a esconder o que tem teste e o que não tem.

A forma é a dos specs existentes: `Test.createTestingModule({ imports: [AppModule] })`, `app.init()`, `await cleanDatabase(app)` (`@tests/database/clean-database`) no `beforeAll`, `app.close()` no `afterAll`, e `request(app.getHttpServer())` do supertest. Quando o cenário exigir um registro preexistente, criá-lo pela própria API é aceitável — é setup, não asserção.

O `cleanDatabase` trunca **todas** as tabelas declaradas em `@infra/database/drizzle/schemas`, na ordem que o `CASCADE` resolver. Nenhum spec lista as tabelas que usa: tabela nova entra no `schemas/index.ts` e passa a ser limpa em todo lugar, sem tocar em spec nenhum. Só importe uma tabela no spec quando for consultá-la em uma asserção.

Os e2e exigem banco no ar com as migrations já aplicadas, rodam sem coverage e **em série** (`fileParallelism: false`): todos compartilham a mesma instância do Postgres, então dois arquivos limpando a mesma tabela em paralelo produziriam falha intermitente, que é o pior tipo de teste — o que ninguém confia nem investiga.

## Fluxo para cada alteração de código

Nenhuma mudança em `src/` fecha sem teste. Na prática:

1. **Localize a RN** em `docs/requirements/rules.md`. Ela costuma trazer restrição que o nome da feature não sugere.
2. **Escreva ou atualize o spec espelhado** antes de mexer na implementação, listando os edge cases da seção acima. Não é obrigatório rodar o ciclo vermelho-verde do TDD, mas escrever o teste primeiro é o que garante que ele descreve a regra, e não o código que você acabou de escrever.
3. **Rode só o spec que você está escrevendo** enquanto implementa — o ciclo curto é o que torna o teste barato de escrever.
4. **Rode o relatório de cobertura** e confira **a linha do arquivo alterado**, não a média geral.
5. **Rode o gate de fechamento** do `server/` antes de dar a tarefa por concluída.

**Alterou código já coberto?** Atualize o spec no mesmo commit. Teste desatualizado é pior que teste ausente: ele afirma um comportamento que não existe mais e dá confiança falsa.

**O teste falhou depois da sua mudança?** A ordem de investigação é: (1) o teste ainda descreve a RN? Então a implementação está errada — conserte-a; (2) a RN mudou? Então atualize o teste e cite a RN nova no nome; (3) o teste estava errado desde sempre? Corrija-o e diga isso explicitamente ao usuário. O que nunca se faz é afrouxar a asserção, trocar o valor esperado pelo valor obtido ou marcar `it.skip` para o verde voltar.

## Anti-padrões

- **Teste que espelha a implementação linha a linha** (`expect(repository.create).toHaveBeenCalled()`) sem verificar efeito nenhum. Ele passa a existir para refletir o código e quebra em toda refatoração, sem nunca ter pego um bug. Prefira o repositório in-memory e asserte o estado.
- **Mock do que dá para instanciar.** Este projeto tem `Either`, entidades puras e repositórios in-memory justamente para não precisar de `vi.mock`. Reserve o mock para a borda externa (relógio, geração de id, serviço de terceiro) e, mesmo lá, prefira injetar um fake.
- **Asserção frouxa**: `toBeTruthy()`, `toBeDefined()`, `not.toThrow()` sozinhos. Passam com o valor errado.
- **`if`/`for` decidindo o que verificar.** A única condicional aceita é o `if (result.isRight())` que estreita o tipo do `Either`. Lógica dentro do teste precisa de teste.
- **Snapshot de objeto de domínio.** Ninguém revisa snapshot; ele é atualizado no reflexo quando falha.
- **Nome genérico** (`'deve funcionar'`, `'testa o use-case'`). O nome é o relatório quando a suíte quebra no CI.
- **Dependência entre testes** — um `it` que só passa porque o anterior criou o registro. Cada `it` monta o seu cenário.

## Checklist

- [ ] O spec está em `test/units/` (ou `test/e2e/`) no mesmo caminho do arquivo em `src/`, com o sufixo correspondente.
- [ ] `describe` nomeia o artefato; cada `it` diz "deve \<resultado\> quando \<condição\>" e cita a RN quando prova regra de negócio.
- [ ] `beforeEach` remonta SUT e dependências; nenhum estado atravessa testes.
- [ ] Entidades vêm de `makeX(...)` da `test/factories/`, exceto no spec da própria entidade.
- [ ] `Either` verificado pelo lado **e** pela classe do erro; invariante verificada com `toThrow(InvariantError)`.
- [ ] Efeito colateral verificado no repositório in-memory, não só o retorno.
- [ ] Edge cases da lista percorridos: limites, datas inexistentes, arredondamento de centavos, registro de outro usuário, vínculos, coleção vazia.
- [ ] O arquivo de teste obedece ao padrão de escrita do repositório, igual ao código de produção — ele não é exceção.
- [ ] O relatório de cobertura mostra o arquivo alterado coberto; o gate de fechamento passou.
- [ ] E2E só ganhou cenário novo se a rota é nova, em um arquivo por controller espelhado — regra de negócio ficou no unitário.

## O que você precisa conseguir rodar

Peça pela intenção; a forma do comando nesta máquina não é decisão desta skill, e a linha transcrita aqui envelhece sem ninguém perceber. O índice do que existe está no `server/CLAUDE.md` e no `help` do `Makefile`.

- **Enquanto escreve** — a suíte unitária inteira, um spec isolado, um caso isolado pelo nome, ou o modo watch.
- **Ao fechar** — o relatório de cobertura (leia a linha do arquivo alterado, nunca a média) e o gate completo do `server/`.
- **Antes de um e2e** — as migrations aplicadas no banco. Sem isso os e2e quebram em tabela inexistente, e a mensagem não diz que o problema é esse.
