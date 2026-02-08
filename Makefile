# Makefile for 5G Health Platform Ingestion Service

.PHONY: help install dev build start test lint typecheck clean migrate simulate docker-build docker-up docker-down docker-logs

help: ## Show this help message
	@echo "5G Health Platform - Ingestion Service"
	@echo ""
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	npm install

dev: ## Run in development mode
	npm run dev

build: ## Build TypeScript
	npm run build

start: ## Run production build
	npm start

test: ## Run tests
	npm test

lint: ## Run linter
	npm run lint

typecheck: ## Run TypeScript type checking
	npm run typecheck

clean: ## Clean build artifacts
	rm -rf dist/ node_modules/ coverage/

migrate: ## Run database migrations
	@echo "Running database migration..."
	psql $(DATABASE_URL) -f db/migrations/001_init.sql

simulate: ## Run vitals simulator (use: make simulate PATIENT_ID=patient-123)
	npm run simulate $(PATIENT_ID)

docker-build: ## Build Docker image
	docker build -t 5g-health-platform-ingestion:latest .

docker-up: ## Start with Docker Compose
	docker compose up -d

docker-down: ## Stop Docker Compose
	docker compose down

docker-logs: ## Show Docker logs
	docker compose logs -f ingestion
