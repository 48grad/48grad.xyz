# Tailscale - Setup

Tailscale is a zero-config mesh VPN built on WireGuard.

## Installation

```bash
curl -fsSL https://tailscale.com/install.sh | sh
```

## Connect

```bash
sudo tailscale up
```

## Useful Commands

```bash
# Check status
tailscale status

# Find your IP
tailscale ip

# Enable exit node
sudo tailscale up --advertise-exit-node
```
