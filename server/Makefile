.DEFAULT_GOAL := help

# Argumentos opcionais dos alvos parametrizados
PKG ?=
FILE ?=
NAME ?=
ARGS ?=
DUMP ?= .tmp/backup.sql

help:
	@echo "Dependências"
	@echo "  make deps                 Instala as dependências (npm install)"
	@echo "  make deps-ci              Instala a partir do lockfile (npm ci)"
	@echo "  make add PKG=<pacote>     Adiciona uma dependência"
	@echo "  make add-dev PKG=<pacote> Adiciona uma dependência de desenvolvimento"
	@echo ""
	@echo "Aplicação"
	@echo "  make dev                  Sobe a API em modo watch"
	@echo "  make start                Sobe a API sem watch"
	@echo "  make debug                Sobe a API em modo debug + watch"
	@echo "  make build                Compila para dist/"
	@echo "  make prod                 Executa o build compilado"
	@echo "  make nest ARGS=\"g module x\"  Executa o Nest CLI"
	@echo ""
	@echo "Qualidade"
	@echo "  make test                 Testes unitários"
	@echo "  make test-watch           Testes unitários em modo watch"
	@echo "  make test-e2e             Testes end-to-end"
	@echo "  make test-cov             Testes com relatório de cobertura"
	@echo "  make test-file FILE=<path>   Testa um arquivo ou padrão"
	@echo "  make test-name NAME=\"<nome>\"  Testa um caso isolado"
	@echo "  make lint                 ESLint com --fix"
	@echo "  make format               Prettier --write"
	@echo "  make typecheck            tsc --noEmit"
	@echo "  make check                typecheck + lint + testes"
	@echo ""
	@echo "Ambiente"
	@echo "  make up                   Sobe todos os serviços em background"
	@echo "  make down                 Derruba os containers (dados preservados)"
	@echo "  make restart              Reinicia os serviços"
	@echo "  make ps                   Status dos serviços"
	@echo "  make logs                 Logs de todos os serviços"
	@echo "  make cli                  Shell bash dentro do workspace"
	@echo "  make clean                Derruba containers E APAGA os volumes"
	@echo ""
	@echo "Banco de dados"
	@echo "  make db                   Sobe apenas o Postgres"
	@echo "  make db-cli               psql conectado ao banco"
	@echo "  make db-logs              Logs do Postgres"
	@echo "  make db-reset             Recria o banco do zero e migra (APAGA os dados)"
	@echo "  make db-dump DUMP=<path>  Exporta o banco (padrão: $(DUMP))"
	@echo "  make db-restore DUMP=<path>  Importa um dump para o banco"
	@echo ""
	@echo "Migrations (Drizzle Kit)"
	@echo "  make db-generate NAME=<nome>  Gera uma migration a partir do schema"
	@echo "  make db-migrate           Aplica as migrations pendentes"
	@echo "  make db-check             Verifica conflitos entre as migrations"
	@echo "  make db-studio            Abre o Drizzle Studio em http://localhost:4983"
.PHONY: help

# --- Dependências ---------------------------------------------------------

deps:
	docker compose run --rm workspace npm install
.PHONY: deps

deps-ci:
	docker compose run --rm workspace npm ci
.PHONY: deps-ci

add:
	docker compose run --rm workspace npm install $(PKG)
.PHONY: add

add-dev:
	docker compose run --rm workspace npm install -D $(PKG)
.PHONY: add-dev

# --- Aplicação ------------------------------------------------------------

dev:
	docker compose run --rm workspace npm run start:dev
.PHONY: dev

start:
	docker compose run --rm workspace npm run start
.PHONY: start

debug:
	docker compose run --rm workspace npm run start:debug
.PHONY: debug

build:
	docker compose run --rm workspace npm run build
.PHONY: build

prod:
	docker compose run --rm workspace npm run start:prod
.PHONY: prod

nest:
	docker compose run --rm workspace npx nest $(ARGS)
.PHONY: nest

# --- Qualidade ------------------------------------------------------------

test:
	docker compose run --rm workspace npm test
.PHONY: test

test-watch:
	docker compose run --rm workspace npm run test:watch
.PHONY: test-watch

test-e2e:
	docker compose run --rm workspace npm run test:e2e
.PHONY: test-e2e

test-cov:
	docker compose run --rm workspace npm run test:cov
.PHONY: test-cov

test-file:
	docker compose run --rm workspace npx vitest run $(FILE)
.PHONY: test-file

test-name:
	docker compose run --rm workspace npx vitest run -t "$(NAME)"
.PHONY: test-name

lint:
	docker compose run --rm workspace npm run lint
.PHONY: lint

format:
	docker compose run --rm workspace npm run format
.PHONY: format

typecheck:
	docker compose run --rm workspace npx tsc --noEmit
.PHONY: typecheck

check: typecheck lint test test-e2e
.PHONY: check

# --- Ambiente -------------------------------------------------------------

up:
	docker compose up -d
.PHONY: up

cli:
	docker compose run --rm workspace bash
.PHONY: cli

ps:
	docker compose ps
.PHONY: ps

logs:
	docker compose logs -f
.PHONY: logs

restart: down up
.PHONY: restart

down:
	docker compose down
.PHONY: down

clean:
	docker compose down -v --remove-orphans
.PHONY: clean

# --- Banco de dados -------------------------------------------------------

db:
	docker compose up -d database
.PHONY: db

db-cli:
	docker compose exec database psql -U $${POSTGRES_USER:-postgres} -d $${POSTGRES_DB:-esliph_finance}
.PHONY: db-cli

db-logs:
	docker compose logs -f database
.PHONY: db-logs

db-reset:
	docker compose down -v --remove-orphans
	docker compose up -d database
	$(MAKE) db-migrate
.PHONY: db-reset

db-dump:
	mkdir -p $$(dirname $(DUMP))
	docker compose exec -T database pg_dump -U $${POSTGRES_USER:-postgres} -d $${POSTGRES_DB:-esliph_finance} > $(DUMP)
.PHONY: db-dump

db-restore:
	docker compose exec -T database psql -U $${POSTGRES_USER:-postgres} -d $${POSTGRES_DB:-esliph_finance} < $(DUMP)
.PHONY: db-restore

# --- Migrations -----------------------------------------------------------

db-generate:
	docker compose run --rm workspace npm run db:generate -- $(if $(NAME),--name=$(NAME))
.PHONY: db-generate

db-migrate:
	docker compose run --rm migrate
.PHONY: db-migrate

db-check:
	docker compose run --rm workspace npm run db:check
.PHONY: db-check

db-studio:
	docker compose run --rm --publish 4983:4983 workspace npm run db:studio
.PHONY: db-studio
