resource "aws_ecs_cluster" "main" {
  name = var.cluster_name

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

locals {
  private_subnet_ids = [for s in aws_subnet.private : s.id]
  redis_url          = "redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:6379"

  bootstrap_image = {
    web     = "${aws_ecr_repository.apps["brickbase-web"].repository_url}:bootstrap"
    mcp     = "${aws_ecr_repository.apps["brickbase-mcp"].repository_url}:bootstrap"
    ingest  = "${aws_ecr_repository.apps["brickbase-ingest"].repository_url}:bootstrap"
    gateway = "${aws_ecr_repository.apps["brickbase-gateway"].repository_url}:bootstrap"
  }

  ecs_services = {
    web = {
      family         = "brickbase-web-production"
      container_name = "brickbase-web"
      image          = local.bootstrap_image.web
      cpu            = "512"
      memory         = "1024"
      port           = 3000
      desired_count  = 2
      autoscale      = true
      target_group   = aws_lb_target_group.web.arn
      container_port = 3000
      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "PORT", value = "3000" },
      ]
      secrets = []
    }
    mcp = {
      family         = "brickbase-mcp-production"
      container_name = "brickbase-mcp"
      image          = local.bootstrap_image.mcp
      cpu            = "256"
      memory         = "512"
      port           = 3100
      desired_count  = 2
      autoscale      = true
      target_group   = aws_lb_target_group.mcp.arn
      container_port = 3100
      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "MCP_TRANSPORT", value = "http" },
        { name = "MCP_PORT", value = "3100" },
      ]
      secrets = []
    }
    ingest = {
      family         = "brickbase-ingest-production"
      container_name = "brickbase-ingest"
      image          = local.bootstrap_image.ingest
      cpu            = "256"
      memory         = "512"
      port           = null
      desired_count  = 1
      autoscale      = false
      target_group   = null
      container_port = null
      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "REDIS_URL", value = local.redis_url },
        { name = "CHAIN_ID", value = "1" },
        { name = "COINBASE_PRODUCT_ID", value = "ETH-USD" },
      ]
      secrets = [
        {
          name      = "INFURA_PROJECT_ID"
          valueFrom = aws_ssm_parameter.app["/brickbase/production/infura/project_id"].arn
        },
      ]
    }
    gateway = {
      family         = "brickbase-gateway-production"
      container_name = "brickbase-gateway"
      image          = local.bootstrap_image.gateway
      cpu            = "256"
      memory         = "512"
      port           = 8081
      desired_count  = 2
      autoscale      = true
      target_group   = aws_lb_target_group.gateway.arn
      container_port = 8081
      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "REDIS_URL", value = local.redis_url },
        { name = "GATEWAY_PORT", value = "8081" },
        { name = "GATEWAY_WS_PATH", value = "/ws/live" },
        { name = "GATEWAY_ALLOWED_ORIGINS", value = local.production_url },
      ]
      secrets = []
    }
  }
}

resource "aws_ecs_task_definition" "app" {
  for_each = local.ecs_services

  family                   = each.value.family
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = each.value.cpu
  memory                   = each.value.memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = each.value.container_name
    image     = each.value.image
    essential = true
    portMappings = each.value.port == null ? [] : [{
      containerPort = each.value.port
      protocol      = "tcp"
    }]
    environment = each.value.environment
    secrets     = each.value.secrets
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = local.log_groups[each.key]
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = each.value.container_name
      }
    }
  }])
}

resource "aws_ecs_service" "app" {
  for_each = local.ecs_services

  name            = each.value.container_name
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app[each.key].arn
  desired_count   = each.value.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = local.private_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  dynamic "load_balancer" {
    for_each = each.value.target_group == null ? [] : [1]
    content {
      target_group_arn = each.value.target_group
      container_name   = each.value.container_name
      container_port   = each.value.container_port
    }
  }

  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  depends_on = [aws_lb_listener.https]
}

resource "aws_appautoscaling_target" "ecs" {
  for_each = { for k, v in local.ecs_services : k => v if v.autoscale }

  max_capacity       = 4
  min_capacity       = 2
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.app[each.key].name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "ecs_cpu" {
  for_each = aws_appautoscaling_target.ecs

  name               = "${each.key}-cpu-50"
  policy_type        = "TargetTrackingScaling"
  resource_id        = each.value.resource_id
  scalable_dimension = each.value.scalable_dimension
  service_namespace  = each.value.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 50
    scale_in_cooldown  = 120
    scale_out_cooldown = 60
  }
}
