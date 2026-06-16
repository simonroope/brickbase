output "ecr_repository_urls" {
  description = "Map of ECR repository URLs."
  value       = { for k, v in aws_ecr_repository.apps : k => v.repository_url }
}

output "ecr_registry_id" {
  description = "AWS account ID for ECR."
  value       = data.aws_caller_identity.current.account_id
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "ecs_cluster_arn" {
  value = aws_ecs_cluster.main.arn
}

output "automated_role_arn" {
  value = aws_iam_role.automated_production.arn
}

output "production_hostname" {
  value = var.production_hostname
}

output "production_url" {
  value = local.production_url
}

output "ssm_path_prefix" {
  value = "/brickbase/production"
}

output "alb_dns_name" {
  value = aws_lb.main.dns_name
}

output "alb_arn" {
  value = aws_lb.main.arn
}

output "redis_primary_endpoint" {
  value = aws_elasticache_cluster.redis.cache_nodes[0].address
}

output "redis_url" {
  value = local.redis_url
}

output "ecs_execution_role_arn" {
  value = aws_iam_role.ecs_execution.arn
}

output "ecs_task_role_arn" {
  value = aws_iam_role.ecs_task.arn
}

output "vpc_id" {
  value = aws_vpc.main.id
}

output "private_subnet_ids" {
  value = local.private_subnet_ids
}

output "public_subnet_ids" {
  value = [for s in aws_subnet.public : s.id]
}

output "ecs_service_names" {
  value = [for s in aws_ecs_service.app : s.name]
}

output "target_group_arns" {
  value = {
    web     = aws_lb_target_group.web.arn
    gateway = aws_lb_target_group.gateway.arn
    mcp     = aws_lb_target_group.mcp.arn
  }
}
