resource "aws_elasticache_subnet_group" "redis" {
  name       = "${local.name_prefix}-redis"
  subnet_ids = [for s in aws_subnet.private : s.id]
}

resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "${local.name_prefix}-redis"
  engine               = "redis"
  engine_version       = "7.1"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  # Pin AZ; ElastiCache reports insufficient AZ capacity as incompatible-network.
  preferred_availability_zones = [local.azs[0]]
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.redis.name
  security_group_ids   = [aws_security_group.redis.id]
  parameter_group_name = "default.redis7"

  tags = {
    Name = "${local.name_prefix}-redis"
  }
}
