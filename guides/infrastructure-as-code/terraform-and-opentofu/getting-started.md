# Terraform / OpenTofu - Getting Started

Infrastructure as Code with Terraform or its open-source fork OpenTofu.

## Install OpenTofu

```bash
curl -fsSL https://get.opentofu.org/install-opentofu.sh | sh
```

## Basic Project Structure

```
project/
  main.tf
  variables.tf
  outputs.tf
  terraform.tfvars
```

## Example: Hetzner Cloud VM

```hcl
terraform {
  required_providers {
    hcloud = {
      source = "hetznercloud/hcloud"
    }
  }
}

provider "hcloud" {
  token = var.hcloud_token
}

resource "hcloud_server" "web" {
  name        = "web-1"
  server_type = "cx22"
  image       = "debian-12"
  location    = "fsn1"
}
```

## Workflow

```bash
tofu init
tofu plan
tofu apply
tofu destroy
```
