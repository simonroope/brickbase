#!/usr/bin/env bash
# ECS production deploy — render task definitions, register, update services.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ENVIRONMENT="${ENVIRONMENT:-production}"
SSM_PREFIX="${SSM_PREFIX:-/brickbase/production}"
AWS_REGION="${AWS_REGION:-eu-west-2}"
CLUSTER="${CLUSTER:-brickbase-uk-production}"
RENDER_DIR="${RENDER_DIR:-${SCRIPT_DIR}/.render}"

EXECUTION_ROLE_ARN="${EXECUTION_ROLE_ARN:-}"
TASK_ROLE_ARN="${TASK_ROLE_ARN:-}"
REDIS_URL="${REDIS_URL:-}"
APP_URL="${APP_URL:-}"

usage() {
  cat <<EOF
Usage: $0 <render|register|deploy|deploy-dry-run|wait-stable>

Required env for register/deploy:
  IMAGE_ACC, IMAGE_TAG
  EXECUTION_ROLE_ARN, TASK_ROLE_ARN (from terraform output or .env.production)
Optional:
  REDIS_URL, APP_URL (defaults from terraform output when set in .env.production)
EOF
}

require_image_vars() {
  : "${IMAGE_ACC:?Set IMAGE_ACC (ECR registry id)}"
  : "${IMAGE_TAG:?Set IMAGE_TAG (git sha or release tag)}"
}

require_role_vars() {
  : "${EXECUTION_ROLE_ARN:?Set EXECUTION_ROLE_ARN}"
  : "${TASK_ROLE_ARN:?Set TASK_ROLE_ARN}"
}

image_uri() {
  local repo="$1"
  echo "${IMAGE_ACC}.dkr.ecr.${AWS_REGION}.amazonaws.com/${repo}:${IMAGE_TAG}"
}

render_service() {
  local service="$1"
  local template="${SCRIPT_DIR}/taskdefs/${service}.json.tmpl"
  local out="${RENDER_DIR}/${service}.json"

  mkdir -p "$RENDER_DIR"
  sed \
    -e "s|__IMAGE__|$(image_uri "brickbase-${service}")|g" \
    -e "s|__EXECUTION_ROLE_ARN__|${EXECUTION_ROLE_ARN}|g" \
    -e "s|__TASK_ROLE_ARN__|${TASK_ROLE_ARN}|g" \
    -e "s|__AWS_REGION__|${AWS_REGION}|g" \
    -e "s|__APP_URL__|${APP_URL}|g" \
    -e "s|__WS_LIVE_URL__|${WS_LIVE_URL:-}|g" \
    -e "s|__REDIS_URL__|${REDIS_URL}|g" \
    -e "s|__SSM_INFURA_ARN__|${SSM_INFURA_ARN:-}|g" \
    -e "s|__CHAIN_ID__|${CHAIN_ID:-1}|g" \
    -e "s|__ETHEREUM_RPC_URL__|${ETHEREUM_RPC_URL:-}|g" \
    -e "s|__ASSET_VAULT_ADDRESS__|${ASSET_VAULT_ADDRESS:-}|g" \
    -e "s|__ASSET_SHARES_ADDRESS__|${ASSET_SHARES_ADDRESS:-}|g" \
    -e "s|__ORACLE_ROUTER_ADDRESS__|${ORACLE_ROUTER_ADDRESS:-}|g" \
    -e "s|__USER_ALLOWLIST_ADDRESS__|${USER_ALLOWLIST_ADDRESS:-}|g" \
    -e "s|__USDC_ADDRESS__|${USDC_ADDRESS:-}|g" \
    "$template" > "$out"
  echo "$out"
}

cmd_render() {
  require_role_vars
  render_service web
  render_service mcp
  render_service ingest
  render_service gateway
  echo "Rendered task definitions in ${RENDER_DIR}"
}

cmd_register() {
  require_image_vars
  require_role_vars
  cmd_render
  for svc in web mcp ingest gateway; do
    aws ecs register-task-definition \
      --region "$AWS_REGION" \
      --cli-input-json "file://${RENDER_DIR}/${svc}.json" \
      --query 'taskDefinition.taskDefinitionArn' \
      --output text
  done
}

cmd_deploy() {
  require_image_vars
  require_role_vars
  cmd_render
  for svc in web mcp ingest gateway; do
    local arn
    arn="$(aws ecs register-task-definition \
      --region "$AWS_REGION" \
      --cli-input-json "file://${RENDER_DIR}/${svc}.json" \
      --query 'taskDefinition.taskDefinitionArn' \
      --output text)"
    aws ecs update-service \
      --region "$AWS_REGION" \
      --cluster "$CLUSTER" \
      --service "brickbase-${svc}" \
      --task-definition "$arn" \
      --force-new-deployment \
      --output text >/dev/null
    echo "Updated brickbase-${svc} -> ${arn}"
  done
}

cmd_wait_stable() {
  aws ecs wait services-stable \
    --region "$AWS_REGION" \
    --cluster "$CLUSTER" \
    --services brickbase-web brickbase-mcp brickbase-ingest brickbase-gateway
  echo "All services stable."
}

cmd_deploy_dry_run() {
  require_image_vars
  require_role_vars
  cmd_render
  ls -la "$RENDER_DIR"
}

main() {
  local cmd="${1:-deploy}"
  case "$cmd" in
    render) cmd_render ;;
    register) cmd_register ;;
    deploy) cmd_deploy ;;
    deploy-dry-run) cmd_deploy_dry_run ;;
    wait-stable) cmd_wait_stable ;;
    -h | help) usage ;;
    *) usage; exit 1 ;;
  esac
}

main "$@"
