// Minimal Terraform example for EKS + RDS snippet (illustrative)
// Adapt with proper variables and state management before use.

provider "aws" {
  region = var.region
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name = "soroscan-cluster"
  cluster_version = "1.26"

  vpc_id     = var.vpc_id
  subnet_ids = var.private_subnet_ids

  node_groups = {
    workers = {
      desired_capacity = 3
      max_capacity     = 6
      instance_type    = "t3.medium"
    }
  }
}

# RDS snippet
resource "aws_db_instance" "soroscan" {
  allocated_storage    = 100
  engine               = "postgres"
  instance_class       = "db.t3.medium"
  name                 = "soroscan"
  username             = var.db_user
  password             = var.db_password
  skip_final_snapshot  = true
}
