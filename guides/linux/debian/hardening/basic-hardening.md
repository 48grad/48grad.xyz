# Debian - Basic Hardening

Essential security hardening steps for a fresh Debian server.

## SSH Hardening

Edit `/etc/ssh/sshd_config`:

```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
Port 2222
```

```bash
systemctl restart sshd
```

## Firewall (UFW)

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 2222/tcp
ufw enable
```

## Automatic Security Updates

```bash
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
```

## Fail2Ban

```bash
apt install -y fail2ban
systemctl enable fail2ban
```
