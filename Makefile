.PHONY: dev build start lint test test-watch typecheck check ci db-generate db-push db-studio clean

dev:
	npm run dev

build:
	npm run build

start:
	npm run start

lint:
	npx eslint .

test:
	npm test

test-watch:
	npm run test:watch

typecheck:
	npx tsc --noEmit

check: lint typecheck

ci: lint typecheck test build

db-generate:
	npx prisma generate

db-push:
	npx prisma db push

db-studio:
	npx prisma studio

clean:
	rm -rf .next node_modules
