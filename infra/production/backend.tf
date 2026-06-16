terraform {
  backend "s3" {
    bucket = "brickbase"
    key    = "production/terraform.tfstate"
    region = "eu-west-2"
  }
}
