# Brickbase production infrastructure (ECS Fargate)

Terraform and deploy tooling for the production environment defined in `docs/prd-build-prod-env.md`.

## What this creates

- VPC (2 AZs), NAT gateway, public/private subnets
- Four ECR repositories: `brickbase-web`, `brickbase-mcp`, `brickbase-ingest`, `brickbase-gateway`
- ElastiCache Redis 7 (single node)
- ECS cluster `brickbase-uk-production` on Fargate (four services)
- Internet-facing ALB with HTTPS (operator ACM cert) and path rules for web, `/ws/live`, `/mcp`
- IAM role `automated-production` for GitHub Actions OIDC
- SSM placeholders under `/brickbase/production/*`

**Not created:** Route 53 hosted zones, DNS records, or ACM certificates (operator-managed).

## Prerequisites

1. AWS CLI + Terraform `>= 1.5`
2. IAM user `brickbase` (or equivalent) with permissions to create the resources above
3. Issued ACM certificate in **eu-west-2** for `production_hostname`
4. S3 bucket **`brickbase`** for remote state (see bootstrap below)
5. GitHub OIDC provider + `terraform.tfvars` trust subjects before CI deploy

## Bootstrap remote state (once)

```bash
aws s3api create-bucket \
  --bucket brickbase \
  --region eu-west-2 \
  --create-bucket-configuration LocationConstraint=eu-west-2

aws s3api put-bucket-versioning \
  --bucket brickbase \
  --versioning-configuration Status=Enabled
```

Or apply `infra/production/bootstrap/` if you prefer Terraform for the bucket.

## Configure and apply

```bash
cd infra/production
cp terraform.tfvars.example terraform.tfvars
# Edit production_hostname, acm_certificate_arn, github_oidc_* 

export AWS_PROFILE=brickbase
aws sts get-caller-identity

terraform init
terraform plan -out=tfplan
terraform apply tfplan
terraform output
```

## Operator DNS (after apply)

Create a Route 53 alias record:

- **Name:** `production_hostname` (from tfvars)
- **Target:** `terraform output -raw alb_dns_name`

## SSM bootstrap

Replace `CHANGE_ME` values:

```bash
aws ssm put-parameter --name /brickbase/production/infura/project_id \
  --type SecureString --value '<value>' --overwrite --region eu-west-2
```

## Local deploy config

```bash
cp .env.production.example .env.production
# Fill IMAGE_ACC, EXECUTION_ROLE_ARN, TASK_ROLE_ARN, REDIS_URL, PRODUCTION_URL, SSM_INFURA_ARN from terraform output
```

## Deploy applications (CI or manual)

```bash
export IMAGE_ACC=$(terraform output -raw ecr_registry_id)
export IMAGE_TAG=<git-sha>
make -C infra/production deploy wait-stable
```

Docker builds use `infra/docker/Dockerfile.*` (see `.github/workflows/production-build-deploy.yml`).

## GitHub Environment `production`

Set variables (from `terraform output`):

| Variable | Source |
|----------|--------|
| `ECR_REGISTRY_ID` | `ecr_registry_id` |
| `AUTOMATED_ROLE_ARN` | `automated_role_arn` |
| `ECS_EXECUTION_ROLE_ARN` | `ecs_execution_role_arn` |
| `ECS_TASK_ROLE_ARN` | `ecs_task_role_arn` |
| `REDIS_URL` | `redis_url` |
| `SSM_INFURA_ARN` | `arn:aws:ssm:eu-west-2:<account>:parameter/brickbase/production/infura/project_id` |
| `NEXT_PUBLIC_*` | Production app config |

Secret: `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`

## Destroy

```bash
terraform destroy
```

This removes production AWS resources including ECR images and Redis data.
