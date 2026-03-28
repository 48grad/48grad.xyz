# WireGuard - Getting Started

WireGuard is a modern, fast, and secure VPN tunnel.

## Installation

```bash
sudo apt install wireguard
```

## Generate Keys

```bash
wg genkey | tee privatekey | wg pubkey > publickey
```

## Basic Configuration

Create `/etc/wireguard/wg0.conf`:

```ini
[Interface]
PrivateKey = <your-private-key>
Address = 10.0.0.1/24
ListenPort = 51820

[Peer]
PublicKey = <peer-public-key>
AllowedIPs = 10.0.0.2/32
```

## Start the Tunnel

```bash
sudo wg-quick up wg0
```
