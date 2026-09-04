---
name: clean-code
description: Padrão de escrita, formatação e design de código do EsliphFinance (server NestJS) — código sem nenhum comentário, autodescritivo pelos nomes, formatado conforme o eslint.config.mjs e o .prettierrc do projeto. Use SEMPRE que for escrever, alterar ou refatorar qualquer arquivo TypeScript deste repositório, mesmo que o pedido seja só "cria o use-case X", "adiciona esse campo", "corrige esse bug" ou "arruma o import" — ela vale antes de escrever, para guiar o design, e é a fonte do padrão que qualquer revisão deste repositório cobra. Também vale quando o pedido mencionar clean code, formatação, nomenclatura, coesão, legibilidade ou remoção de comentários. Não cobre a avaliação de código já escrito: "revisa isso", "esse código está bom?" e "o que faltou aqui" pedem o confronto do código com tudo que o projeto decidiu, e isso é outro território.
---

# Clean Code — EsliphFinance

Este repositório tem um estilo próprio e bastante opinado. Ele não é o "clean code de livro": há decisões específicas aqui (zero comentários, `Either` no lugar de exceção, linha em branco antes de `return`) que só aparecem no código já escrito. Esta skill existe para que código novo seja indistinguível do código que já está lá.

Vale para `server/`. O `mobile/` foi removido para ser reescrito do zero; quando voltar a existir, esta skill precisa ser revisada para cobri-lo de novo.

## Fronteira

**Território** — define o padrão de escrita do código deste repositório: formatação, nomes, ausência de comentário e as decisões de design que separam um artefato bem recortado de um mal recortado. É a **fonte** desse padrão: quem revisa o cobra daqui, e o texto normativo mora só neste arquivo.

**Fora da fronteira** — que comportamento o código deve ter (isso está em `docs/requirements/`); onde cada arquivo mora e como as camadas se relacionam (isso está em `server/CLAUDE.md` e `docs/architecture/`); o que se testa e como o teste é escrito; como o comando de verificação é executado nesta máquina; e a avaliação de código já escrito, que confronta o diff com tudo que o projeto decidiu e não apenas com o estilo.

**O que não preciso saber** — qual RN o código implementa. O estilo é o mesmo em qualquer regra, e conferir a regra aqui é começar uma revisão de especificação disfarçada de formatação. Estilo verde nunca significou código correto, e este arquivo não é o lugar de descobrir isso.

**Contrato de borda** — recebo a intenção de escrever ou alterar um arquivo TypeScript. Entrego o código já no padrão, e o [checklist](#checklist) como a lista fechada do que este território cobra.

## Como usar

**Antes de escrever**: leia esta skill inteira e decida os nomes primeiro. Nomes são o mecanismo pelo qual este código se explica — se você precisou de um comentário para justificar um trecho, o nome ainda não está pronto.

**Depois de escrever**: rode a verificação — não entregue código que você não formatou. Formatar não é revisar: o [checklist](#checklist) daqui é o eixo mais raso de qualquer revisão séria deste repositório, porque estilo verde não diz nada sobre o código fazer a coisa certa.

Isto aqui cobre _como_ escrever. A arquitetura — camadas, regra de dependência, onde cada arquivo mora, contratos de use-case e repositório — está em `server/CLAUDE.md` e, em detalhe, em `docs/architecture/`; as regras de negócio em `docs/requirements/`. Consulte-os; não duplique o conteúdo deles aqui.

## Zero comentários

**Nenhum comentário no código.** Nem `//`, nem `/* */`, nem JSDoc `/** */`, nem cabeçalho de arquivo, nem `TODO`. O código precisa se explicar pelos nomes e pela estrutura.

A razão é simples: comentário não é verificado por ninguém. Ele não compila, não roda em teste, não quebra o lint — então ele apodrece em silêncio enquanto o código ao lado muda, e a partir daí passa a mentir. Um nome errado é um bug visível; um comentário errado é uma armadilha invisível.

Ao abrir um arquivo para qualquer alteração, remova **todos** os comentários dele — inclusive os que estão longe da linha que você veio mexer. Arquivo tocado sai limpo. O diff cresce um pouco, e vale a pena: comentário que sobrevive porque "não era da minha região" é precisamente o que apodrece por anos.

Única coisa que não é alvo desta regra: **diretiva de ferramenta**, que é sintaxe disfarçada de comentário e tem efeito real na execução — `// @ts-check`, `// eslint-disable-next-line`, `// @ts-expect-error`, shebang. Preserve-as. Elas não explicam nada, elas configuram.

### Apagar o comentário sem perder a informação

O erro clássico é apagar o comentário e perder junto o motivo que ele carregava. A informação precisa migrar para um lugar que o compilador ou o teste consigam vigiar. Três destinos, em ordem de preferência:

**1. Um nome — de função, constante ou variável intermediária.** É o destino da maioria dos casos: o comentário vira a assinatura de um método privado.

Antes:

```ts
/* A propriedade do registro é verificada aqui, no caso de uso, e não por
   filtro implícito no repositório (RN-0010, RN-0011). */
if (note.ownerId.toString() !== ownerId) {
    return left(new NotAllowedError())
}
```

Depois:

```ts
if (!this.isOwnedBy(note, ownerId)) {
    return left(new NotAllowedError())
}
```

Número solto ganha uma constante nomeada em vez de um comentário explicando o que ele é — como `Note.TITLE_MAX_LENGTH`, que a entidade `Note` já expõe.

**2. O nome do teste.** É onde a referência à RN sobrevive, e sobrevive melhor: se a regra mudar, o teste falha. O repositório já faz isso —

```ts
it('deve retornar NotAllowedError quando a nota é de outro usuário (RN-0010, RN-0011)', async () => {
```

Ao implementar uma regra de negócio, a citação da RN vai para o nome do `it(...)`, nunca para uma linha de comentário no código de produção.

**3. Um tipo ou um erro nomeado.** `Either<ResourceNotFoundError | NotAllowedError, { note: Note }>` já declara, na assinatura, tudo que pode dar errado. Nenhum comentário faz isso melhor, e a assinatura é conferida pelo `tsc`.

Se depois disso ainda sobrou algo que não coube em lugar nenhum — decisão de arquitetura, pendência, contexto de negócio —, o lugar é fora do código: o `CLAUDE.md` da pasta, o `docs/requirements/`, ou um ticket (`LIPH-XX`). Nunca um `// TODO`.

## Formatação

Prettier e ESLint decidem, e a configuração é a fonte de verdade (`server/.prettierrc`, `server/eslint.config.mjs`). O que você mais vai esbarrar:

| Regra                              | Valor                                                       |
| ---------------------------------- | ----------------------------------------------------------- |
| Ponto e vírgula                    | **Nunca** (`semi: false`)                                   |
| Aspas                              | Simples                                                     |
| Indentação                         | 2 espaços                                                   |
| Largura da linha                   | 160 — é larga, aproveite; não quebre linha por hábito de 80 |
| Parênteses em arrow de 1 parâmetro | Omitidos: `item => item.id`                                 |
| Fim de linha                       | `auto` (o repositório é desenvolvido no Windows)            |

A regra que mais passa despercebida é o `padding-line-between-statements`, que exige **linha em branco**:

- sempre **antes de todo `return`**;
- depois de um bloco de declarações (`const`/`let`/`var`), antes de qualquer outra coisa — mas não entre declarações consecutivas;
- depois de `case`, `default` e `directive`.

Na prática o corpo de uma função fica assim:

```ts
async execute({ noteId, ownerId }: GetNoteRequest): Promise<GetNoteResponse> {
  const note = await this.notesRepository.findById(noteId)

  if (!note) {
    return left(new ResourceNotFoundError('Nota não encontrada'))
  }

  return right({ note })
}
```

**Imports** seguem um padrão consistente no repositório que nenhum plugin impõe — é disciplina, então repare: primeiro os pacotes externos, linha em branco, depois os internos por alias (`@core`, `@domain`, `@infra`, `@shared`), cada grupo em ordem alfabética. Import relativo só entre irmãos da mesma pasta.

## Nomes

O nome é a única documentação que o projeto aceita, então ele carrega um peso maior aqui do que no código comum.

- **Idioma**: identificadores e arquivos em inglês. Descrições de teste (`describe`/`it`) em português, como o repositório já faz. **Mensagem de erro é texto de usuário e vai em português** — `new InvariantError('O título da nota não pode ser vazio')`, `new ResourceNotFoundError('Nota não encontrada')` —, enquanto o `code` do erro continua em inglês e é o que o cliente consome.
- **Arquivos**: kebab-case com sufixo do papel — `create-note.ts`, `notes-repository.ts`, `create-note.controller.ts`, `note-presenter.ts`. Um artefato por arquivo, e o nome do arquivo espelha o do artefato.
- **Diga o domínio, não o mecanismo**: `isOwnedBy`, `archive`, `validateTitle` — não `checkData`, `process`, `handleItem`.
- **Booleano** afirma um fato: `isOwnedBy`, `hasOverdueInvoice`. Nada de `flag`, `status` genérico ou negação embutida (`isNotPaid` obriga o leitor a resolver uma dupla negativa depois do `!`).
- **Sem abreviação** que não seja universal no projeto (`id`, `props`). `qty`, `desc`, `tmp` não são.
- **Sem ruído**: `NoteData`, `NoteInfo`, `NoteManager`, `NoteHelper` não dizem nada. Se a classe é um gerente de coisa nenhuma, ela provavelmente não deveria existir.
- **`sut`** é a exceção consagrada, e só em teste: é o _system under test_, como nos specs existentes.

## Design

Coesão e coerência valem mais que qualquer regra de formatação — formatação o Prettier conserta, design não.

**Uma responsabilidade por artefato.** Um use-case faz uma coisa e expõe um único `execute`. Controller traduz HTTP ↔ use-case e nada mais — regra de negócio dentro de controller é o erro estrutural mais comum aqui. Entidade guarda as suas invariantes.

**Guard clause, sempre.** Trate o caso excepcional e saia; o caminho feliz fica no nível de indentação mais raso, no fim do método. Isso já é o padrão em todo `execute` do repositório. `if/else` aninhado é sinal de que faltou um `return` cedo.

**Função pequena, um nível de abstração.** Se o corpo mistura decisão de negócio com detalhe de manipulação de string, extraia o detalhe para um método privado nomeado — foi assim que `Note.validateTitle` nasceu.

**Erro esperado é valor de retorno, não exceção.** `Either<Erro, Sucesso>` com `left`/`right`. Exceção fica para falha inesperada e para invariante de domínio violada (`InvariantError`, lançada pela entidade). Um `throw` dentro de use-case para sinalizar regra de negócio está errado.

**Dependa da abstração.** Use-case recebe o repositório pelo tipo abstrato no construtor, `private readonly`. Nunca instancie a implementação concreta lá dentro.

**Sem parâmetro-flag.** `archive(true)` não diz nada no ponto da chamada; dois métodos nomeados dizem.

**Sem obsessão por primitivo.** Dinheiro é `Money` sobre inteiro em centavos — nunca `number` solto, nunca `float`. Identidade é `UniqueEntityID`, não `string`.

**Imutabilidade onde couber.** `readonly` em campo que não muda depois do construtor, como em `Left`/`Right` e nas dependências injetadas.

**Spread antes do valor confiável.** Ao montar um objeto que mistura dado vindo de fora (corpo, query, params) com valor que o servidor decidiu — o dono do registro, o usuário do token —, o spread vem **primeiro** e o valor confiável **por último**. Quem está por último vence a chave repetida:

```ts
await this.endSession.execute({ ...body, userId: currentUser.id })
```

Na outra ordem, `{ userId: currentUser.id, ...body }`, um `userId` presente no corpo sobrescreveria o do token e o cliente escolheria em nome de quem a operação roda. Hoje o `ZodValidationPipe` remove a chave não declarada e o objeto nunca chega com ela — a ordem certa é o que garante que continue assim se o schema ganhar um campo, o pipe mudar de modo ou a rota passar a receber o objeto por outro caminho. Não é redundância: é a diferença entre depender de uma camada e depender de duas.

Vale para todo dado sensível — identidade, dono, papel, permissão, valor calculado pelo servidor —, não só `userId`. Onde o de fora é que **deve** vencer, a ordem se inverte naturalmente e continua correta: `Note.create({ ...props, title })` põe o `title` já validado depois do spread justamente porque é ele que precisa prevalecer.

**Não invente abstração para um caso só.** Camada a mais "para o futuro" é custo hoje e adivinhação sobre amanhã. O projeto já tem estrutura suficiente; siga a que existe.

## Checklist

Antes de dar a tarefa por concluída:

- [ ] Nenhum comentário no código que você escreveu ou alterou — e o que eles diziam virou nome, teste ou tipo.
- [ ] Nenhum ponto e vírgula; aspas simples; 2 espaços.
- [ ] Linha em branco antes de todo `return` e depois dos blocos de declaração.
- [ ] Imports agrupados: externos, linha em branco, internos por alias em ordem alfabética.
- [ ] Nomes em inglês, sem abreviação e sem ruído; descrições de teste e mensagens de erro em português.
- [ ] Use-case retorna `Either`; erro de negócio não é `throw`.
- [ ] Guard clauses no lugar de aninhamento.
- [ ] Nenhum valor monetário como `number` cru.
- [ ] Em objeto que mistura entrada do cliente com dado sensível do servidor, o spread vem antes e o valor confiável por último.
- [ ] Caso de uso novo entrou com teste unitário citando a RN no nome.

## Verificação

Antes de entregar, peça três coisas, nesta ordem — **a intenção, não o comando**: **formatar** o código, **passar o lint** com correção automática e **checar os tipos**. Ao fechar a tarefa, peça o **gate completo** do `server/`, que inclui os três mais os testes.

Como cada uma dessas intenções vira comando nesta máquina não é decisão desta skill, e transcrever a linha aqui garante que ela fique errada no dia em que o alvo mudar. O índice do que dá para rodar está no `server/CLAUDE.md` e no `help` do `Makefile` — é ali que se confere, não na memória.

Se o lint reclamar de algo que esta skill não cobre, a configuração ganha — e vale avisar, porque significa que esta skill está desatualizada.

