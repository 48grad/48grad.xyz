# Debian - Minimal Install

A minimal Debian installation for servers.

## Download

Get the netinst ISO from [debian.org](https://www.debian.org/distrib/netinst).

## Post-Install Essentials

```bash
apt update && apt upgrade -y
apt install -y curl wget git vim ufw
```

## Set Hostname

```bash
hostnamectl set-hostname myserver
```

## Configure Timezone

```bash
timedatectl set-timezone Europe/Berlin
```
