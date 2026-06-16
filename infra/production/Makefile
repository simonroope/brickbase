# Production ECS deploy — see infra/production/README.md
-include .env.production

ENVIRONMENT        ?= production
SSM_PREFIX         ?= /brickbase/production
AWS_REGION         ?= eu-west-2
CLUSTER            ?= brickbase-uk-production
IMAGE_REPO_WEB     ?= brickbase-web
IMAGE_REPO_MCP     ?= brickbase-mcp
IMAGE_REPO_INGEST  ?= brickbase-ingest
IMAGE_REPO_GATEWAY ?= brickbase-gateway

.PHONY: help render deploy deploy-dry-run wait-stable

help:
	@echo "Targets: render | deploy | deploy-dry-run | wait-stable"
	@echo "Required: IMAGE_ACC, IMAGE_TAG (and role ARNs in .env.production)"

render:
	@chmod +x deploy.sh
	@./deploy.sh render

deploy:
	@chmod +x deploy.sh
	@./deploy.sh deploy

deploy-dry-run:
	@chmod +x deploy.sh
	@./deploy.sh deploy-dry-run

wait-stable:
	@chmod +x deploy.sh
	@./deploy.sh wait-stable
