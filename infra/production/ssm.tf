resource "aws_ssm_parameter" "app" {
  for_each = local.ssm_parameters

  name  = each.key
  type  = each.value
  value = "CHANGE_ME"

  lifecycle {
    ignore_changes = [value]
  }
}
