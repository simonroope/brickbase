locals {
  name_prefix = "${var.project_name}-${var.environment}"

  ecr_repositories = toset([
    "brickbase-web",
    "brickbase-mcp",
    "brickbase-ingest",
    "brickbase-gateway",
  ])

  azs = slice(data.aws_availability_zones.available.names, 0, 2)

  production_url = "https://${var.production_hostname}"

  log_groups = {
    web     = "/ecs/${var.cluster_name}/brickbase-web"
    mcp     = "/ecs/${var.cluster_name}/brickbase-mcp"
    ingest  = "/ecs/${var.cluster_name}/brickbase-ingest"
    gateway = "/ecs/${var.cluster_name}/brickbase-gateway"
  }

  ssm_parameters = {
    "/brickbase/production/infura/project_id" = "SecureString"
    "/brickbase/production/coinbase/api_key"  = "SecureString"
    "/brickbase/production/redis/auth_token"  = "SecureString"
    "/brickbase/production/rpc/url"           = "String"
  }
}
