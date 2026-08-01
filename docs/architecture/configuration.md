# Configuração

> **Cobre** `server/src/infra/env` · **Requisitos** RNF003 · RNF005 · RNF007 · RN005 · RN006

Como uma variável de ambiente é declarada, validada e lida. A configuração vive inteira em `infra/env`, em três arquivos: `env.ts` declara o schema, `validate-env.ts` o roda no bootstrap, `env.service.ts` é a única forma de ler.

## As variáveis

| Variável | Padrão | Para que serve |
| -------- | ------ | -------------- |
| `NODE_ENV` | `development` | `development`, `test` ou `production`; endurece a validação em produção |
| `PORT` | `3000` | Porta da API |
| `DATABASE_URL` | **obrigatória** | URL de conexão; precisa ser URL válida |
| `DATABASE_SSL` | `false` | `true` para instância gerenciada em nuvem (RNF003); exige certificado válido |
| `DATABASE_POOL_MAX` | `10` | Tamanho máximo do pool |
| `CORS_ORIGINS` | `*` | Origens aceitas, separadas por vírgula; o schema já entrega a lista, com os vazios descartados |
| `ENFORCE_HTTPS` | `true` em produção, `false` fora | Redireciona HTTP para HTTPS e habilita o HSTS (RNF007) |
| `HSTS_MAX_AGE` | `31536000` | Duração, em segundos, do `Strict-Transport-Security` |
| `JWT_SECRET` | **obrigatória** | Segredo HS256, mínimo de 32 caracteres (RNF005) |
| `ACCESS_TOKEN_EXPIRES_IN_SECONDS` | `900` | Validade do token de acesso (RN005) |
| `REFRESH_TOKEN_EXPIRES_IN_SECONDS` | `2592000` | Validade do token de renovação (RN006) |

O schema **transforma**, não só valida: `DATABASE_SSL` e `ENFORCE_HTTPS` chegam ao `EnvService` como `boolean`, `CORS_ORIGINS` como `string[]`, os numéricos como `number`. Quem lê nunca converte.

`ENFORCE_HTTPS` é o único com padrão derivado: fica `undefined` no schema e um `transform` final o resolve para `NODE_ENV === 'production'`. É o que permite distinguir "não declarado" de "declarado como `false`" — e essa distinção é o que faz a regra de produção abaixo funcionar.

## O que o schema recusa

`validateEnv` roda pelo `ConfigModule.forRoot({ validate })` e **derruba a aplicação** com a lista completa de problemas. Não há aviso: ou a configuração está inteira, ou o processo não sobe.

| Condição | Quando vale |
| -------- | ----------- |
| `REFRESH_TOKEN_EXPIRES_IN_SECONDS` ≤ `ACCESS_TOKEN_EXPIRES_IN_SECONDS` | Sempre (RN006) |
| `ENFORCE_HTTPS="false"` | Só em `NODE_ENV="production"` |
| `*` em `CORS_ORIGINS` | Só em `NODE_ENV="production"` |

A mensagem de erro é **em inglês** e distingue variável ausente (`X is required`) de variável inválida (`X: <motivo>`). É a exceção consciente à regra de idioma do repositório: esse texto é diagnóstico de quem opera a aplicação, não texto de tela, e sai no log antes de existir qualquer usuário.

## Como se lê

`EnvService.get('CHAVE')` é a única forma. O retorno é tipado pela chave — `get('CORS_ORIGINS')` é `string[]`, `get('PORT')` é `number` —, então errar o nome ou o tipo não compila. `process.env` espalhado pelo código é proibido: quebraria a validação centralizada e a tipagem.

`EnvModule` é `@Global()`, então `EnvService` é injetável em qualquer módulo. Ver [`modules-and-di.md`](modules-and-di.md).

**A única exceção legítima é `drizzle.config.ts`**, que lê `process.env` com `dotenv/config` porque o Drizzle Kit roda fora do processo do Nest e não tem acesso ao container de injeção. Ver [`persistence.md`](persistence.md).

Quando um caso de uso precisa de um valor de configuração, ele recebe **o valor**, resolvido na fábrica do provider — nunca o `EnvService`. É o que mantém a camada de aplicação livre da infraestrutura.

## Onde tocar

Variável nova entra em três lugares, no mesmo passo:

1. `envSchema` em `env.ts`, com tipo, padrão e transformação;
2. `.env.example`, que é versionado justamente para documentar o conjunto — com o comentário dizendo para que serve e o requisito que a motiva;
3. o serviço do Compose e o workflow do CI, se a aplicação precisar dela para subir naquele ambiente — ver [`server/CLAUDE.md`](../../server/CLAUDE.md).

Nenhum segredo é versionado: só o `.env.example` vai para o repositório, com defaults de desenvolvimento.

## Ainda não existe

| Ausente | Consequência |
| ------- | ------------ |
| Recarga de configuração em runtime | Mudar variável exige reiniciar o processo |
| Origem de segredo que não seja variável de ambiente | Não há integração com cofre; `JWT_SECRET` vive no ambiente do processo |
| Configuração por perfil de ambiente | `NODE_ENV` só endurece regras pontuais; não há arquivo por ambiente |
