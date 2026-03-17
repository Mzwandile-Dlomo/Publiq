.DEFAULT_GOAL := help
.PHONY: help dev build start lint test test-watch typecheck check ci db-generate db-push db-studio clean

help: ## Show this help message
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z0-9_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

dev: ## Start the development server
	npm run dev

build: ## Build the application
	npm run build

start: ## Start the production server
	npm run start

lint: ## Run ESLint
	npx eslint .

test: ## Run tests
	npm test

test-watch: ## Run tests in watch mode
	npm run test:watch

typecheck: ## Run TypeScript type checking
	npx tsc --noEmit

check: lint typecheck ## Run lint and typecheck

ci: lint typecheck test build ## Run CI tasks

db-generate: ## Generate Prisma client
	npx prisma generate

db-push: ## Push Prisma schema to database
	npx prisma db push

db-studio: ## Open Prisma Studio
	npx prisma studio

clean: ## Clean build artifacts and node_modules
	rm -rf .next node_modules
