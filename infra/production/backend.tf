terraform {
  backend "s3" {
    bucket = "brickbase-531767776154"
    key    = "production/terraform.tfstate"
    region = "eu-west-2"
  }
}
