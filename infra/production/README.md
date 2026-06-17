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
3. Issued ACM SSL/TLS certificate in **eu-west-2** for `production_hostname`
4. S3 bucket **`brickbase-531767776154`** for remote state (see bootstrap below)
5. GitHub OIDC provider + `terraform.tfvars` trust subjects before CI deploy

## Bootstrap remote state (once)

```bash
export AWS_PROFILE=brickbase;
aws s3 ls

aws s3api create-bucket \
  --bucket brickbase-531767776154 \
  --region eu-west-2 \
  --create-bucket-configuration LocationConstraint=eu-west-2

aws s3api put-bucket-versioning \
  --bucket brickbase-531767776154 \
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

Create a Route 53 **alias A** record (apex domains cannot use CNAME):

- **Name:** `production_hostname` (from tfvars)
- **Target:** `terraform output -raw alb_dns_name`

### CLI (from repo root)

```bash
export AWS_PROFILE=brickbase
cd infra/production

HOSTNAME=$(terraform output -raw production_hostname)
ALB_DNS=$(terraform output -raw alb_dns_name)
ALB_ARN=$(terraform output -raw alb_arn)
ALB_ZONE_ID=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns "$ALB_ARN" --region eu-west-2 \
  --query 'LoadBalancers[0].CanonicalHostedZoneId' --output text)
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones-by-name --dns-name "$HOSTNAME" \
  --query 'HostedZones[0].Id' --output text | sed 's|/hostedzone/||')

aws route53 change-resource-record-sets \
  --hosted-zone-id "$HOSTED_ZONE_ID" \
  --change-batch "$(cat <<EOF
{
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "${HOSTNAME}",
      "Type": "A",
      "AliasTarget": {
        "HostedZoneId": "${ALB_ZONE_ID}",
        "DNSName": "${ALB_DNS}",
        "EvaluateTargetHealth": true
      }
    }
  }]
}
EOF
)"
```

Verify: `dig +short "$HOSTNAME"` and `curl -I "https://${HOSTNAME}"` => (502/503 is OK until images are deployed).

## SSM bootstrap

Replace <value> with infura id value.

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
