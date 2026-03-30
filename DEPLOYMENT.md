# Deployment Guide

This guide covers deploying the World Cup Pool to a DigitalOcean Droplet with a custom domain and automatic HTTPS via Caddy.

## Prerequisites

- A GitHub account
- A domain name (instructions below use Cloudflare Registrar)
- A DigitalOcean account (credit card only, no ID verification required)

---

## Step 1 — Buy a domain

Go to [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/) and register your domain (e.g. `capsworldcup.com`). Cloudflare is the cheapest registrar and makes DNS management easy. Keep the tab open — you'll need it in Step 3.

---

## Step 2 — Create a Droplet on DigitalOcean

1. Sign up at [digitalocean.com](https://www.digitalocean.com)
2. Click **Create → Droplet**
3. Choose:
   - **Region:** any — pick closest to your users (New York or San Francisco for US)
   - **Image:** Ubuntu 24.04 LTS
   - **Size:** Basic → Regular SSD → **$6/mo** (1 vCPU, 1 GB RAM — sufficient for a small pool)
4. Under **Authentication**, choose **SSH Key** and paste your public key:
   ```bash
   cat ~/.ssh/id_ed25519.pub   # or id_rsa.pub
   ```
5. Click **Create Droplet**
6. Copy the Droplet's **IP address** from the dashboard

---

## Step 3 — Point your domain at the server

In Cloudflare, go to your domain → **DNS** → **Add record**:

| Type | Name | Value | Proxy |
|------|------|-------|-------|
| A | `@` | `<your server IP>` | DNS only (grey cloud) |
| A | `www` | `<your server IP>` | DNS only (grey cloud) |

> Make sure proxy is **off** (grey cloud, not orange). Caddy needs a direct connection to provision SSL certificates.

DNS propagates in ~1–2 minutes with Cloudflare.

---

## Step 4 — Set up the server

SSH in:
```bash
ssh root@<your-server-ip>
```

Install Docker:
```bash
curl -fsSL https://get.docker.com | sh
```

Open the firewall:
```bash
ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw enable
```

---

## Step 5 — Push your code to GitHub

On your local machine, create a **private** GitHub repo, then:

```bash
cd ~/personal_projects/caps_world_cup
git init
git add .
git commit -m "initial commit"
git remote add origin git@github.com:yourname/caps-world-cup.git
git push -u origin main
```

---

## Step 6 — Clone and configure on the server

```bash
git clone git@github.com:yourname/caps-world-cup.git /opt/caps-world-cup
cd /opt/caps-world-cup
cp .env.example .env
nano .env
```

Set these values — replace every placeholder:

```env
POSTGRES_PASSWORD=<strong random password>
ADMIN_PASSWORD=<strong password you'll use at /admin>
DOMAIN=capsworldcup.com
FRONTEND_URL=https://capsworldcup.com
FRONTEND_API_URL=https://capsworldcup.com/api
FRONTEND_WS_URL=wss://capsworldcup.com/ws
```

Save and exit: `Ctrl+X`, `Y`, `Enter`.

---

## Step 7 — Go live

```bash
docker compose up -d --build
```

Caddy will automatically obtain a free SSL certificate from Let's Encrypt within ~30 seconds. Your site will be live at `https://capsworldcup.com`.

---

## Step 8 — Verify

```bash
docker compose ps          # all 4 containers should show "running"
docker compose logs caddy  # should show "certificate obtained"
```

Visit `https://capsworldcup.com` — you should see the site with a valid SSL padlock.

---

## Deploying updates

Whenever you make local changes and want to push them live:

```bash
# On your local machine
git add . && git commit -m "describe your change" && git push

# On the server
ssh root@<your-server-ip>
cd /opt/caps-world-cup && git pull && docker compose up -d --build
```

---

## Troubleshooting

```bash
docker compose logs api       # API / database errors
docker compose logs caddy     # SSL / proxy errors
docker compose logs frontend  # nginx errors
docker compose logs db        # Postgres errors
```

**SSL certificate not provisioning?**
- Check that the Cloudflare proxy is set to DNS only (grey cloud, not orange)
- Make sure ports 80 and 443 are open: `ufw status`
- Check Caddy logs: `docker compose logs caddy`

**Site loads but API calls fail?**
- Confirm `FRONTEND_URL` and `FRONTEND_WS_URL` in `.env` use `https://` and `wss://` respectively
- Rebuild after any `.env` change: `docker compose up -d --build`

**Need to reset the database:**
```bash
docker compose down -v && docker compose up -d --build
```
> ⚠️ This deletes all data permanently.
