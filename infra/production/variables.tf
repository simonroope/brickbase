variable "aws_region" {
  type        = string
  description = "AWS region for production infrastructure."
  default     = "eu-west-2"
}

variable "project_name" {
  type        = string
  description = "Resource naming prefix."
  default     = "brickbase"
}

variable "environment" {
  type        = string
  description = "Environment label."
  default     = "production"
}

variable "cluster_name" {
  type        = string
  description = "ECS cluster name."
  default     = "brickbase-uk-production"
}

variable "production_hostname" {
  type        = string
  description = "Pre-existing public DNS name (FQDN, no scheme)."
}

variable "acm_certificate_arn" {
  type        = string
  description = "Pre-existing Issued ACM certificate ARN in eu-west-2 for production_hostname."
}

variable "vpc_cidr" {
  type        = string
  description = "VPC CIDR when creating a new VPC."
  default     = "10.30.0.0/16"
}

variable "github_oidc_provider_arn" {
  type        = string
  description = "GitHub Actions OIDC provider ARN; null disables OIDC trust on automated-production."
  default     = null
}

variable "github_oidc_subjects" {
  type        = list(string)
  description = "JWT sub claims allowed to assume automated-production."
  default     = []
}

variable "automated_trust_principal_arns" {
  type        = list(string)
  description = "Fallback IAM principal ARNs for sts:AssumeRole."
  default     = []

  validation {
    condition     = var.github_oidc_provider_arn != null || length(var.automated_trust_principal_arns) > 0
    error_message = "Set github_oidc_provider_arn and github_oidc_subjects, or automated_trust_principal_arns, for automated-production trust."
  }
}

variable "tags" {
  type = map(string)
  default = {
    Project     = "brickbase"
    Environment = "production"
  }
}
