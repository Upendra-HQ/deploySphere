# DeploySphere — Go-Live Runbook (IP-only launch)

Follow these steps in order on your own machine / SSH session. I can't reach
your EC2 instance directly (this environment has no general network egress),
so these are exact commands for you to run.

## 0. Before you start

- Note your EC2 instance's **public IPv4 address** (EC2 console → Instances).
- Consider allocating an **Elastic IP** and associating it with the instance.
  Without one, the public IP changes on stop/start, and since
  `VITE_API_BASE_URL`/`VITE_WS_URL` are baked into the frontend at build
  time, an IP change means rebuilding the frontend image again.
- Security Group on the instance must allow inbound **22 (SSH)** and **80
  (HTTP)** from `0.0.0.0/0` (or your IP for SSH). No SSL yet, so 443 isn't
  needed until you add a domain.

## 1. Generate a Gmail App Password

1. On the project's Gmail account: Google Account → Security → turn on
   **2-Step Verification** (required for app passwords).
2. Security → **App passwords** → app: "Mail", device: "Other" → name it
   "DeploySphere" → copy the 16-character password shown.
3. Keep this password handy for step 3 — it goes in `SMTP_PASS`, not your
   normal Gmail password (Google blocks plain-password SMTP login).

## 2. SSH in and bootstrap the host

From your own machine, in the project folder:

```bash
chmod 400 Deploy-sphere-key.pem
ssh -i Deploy-sphere-key.pem ubuntu@<EC2_PUBLIC_IP>
```

Once connected, on the EC2 instance:

```bash
curl -fsSL https://raw.githubusercontent.com/Upendra-HQ/deploySphere/main/deploy-ec2.sh -o deploy-ec2.sh
chmod +x deploy-ec2.sh
REPO_URL=https://github.com/Upendra-HQ/deploySphere.git ./deploy-ec2.sh
```

This installs Docker, clones the repo to `~/deploysphere-app`, and creates
`.env.production` from the example, then stops so you can fill in real
values.

## 3. Fill in `.env.production`

```bash
cd ~/deploysphere-app
nano .env.production
```

Set, at minimum:

- `POSTGRES_PASSWORD` / `DATABASE_URL` — generate with `openssl rand -base64 24`
- `JWT_SECRET` — generate with `openssl rand -base64 32`
- `FRONTEND_URL`, `BACKEND_URL`, `CORS_ORIGINS`, `VITE_API_BASE_URL` — all
  `http://<EC2_PUBLIC_IP>` (same host — no domain yet)
- `VITE_WS_URL` — `ws://<EC2_PUBLIC_IP>/api` (must include `/api`, see note
  in the file)
- `EMAIL_SERVICE=smtp`, `SMTP_USER`/`SMTP_FROM` = your Gmail address,
  `SMTP_PASS` = the app password from step 1

Leave `GITHUB_CLIENT_ID`/`SECRET` blank unless you've set up a GitHub OAuth
App — the app runs in mock mode without them (repo URLs entered manually).

## 4. Launch

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
```

All containers should show `Up`/`healthy`. If `backend-api` restarts in a
loop, check logs — it's almost always `DATABASE_URL` or Postgres not ready:

```bash
docker logs deploysphere-backend-prod --tail 100
```

## 5. Verify

- Backend health (bypasses nginx, hits the container's exposed port
  directly — the `/health` route isn't proxied under `/api/` so it's not
  reachable through the gateway on port 80):
  ```bash
  curl http://localhost:5000/health
  ```
- Full site through the gateway: open `http://<EC2_PUBLIC_IP>` in a browser.
- Register a real account, then check `deploysphere-backend-prod` logs —
  you'll see either a real send confirmation or an SMTP error:
  ```bash
  docker logs deploysphere-backend-prod --tail 50 | grep -i email
  ```
- Click the verification link in the actual inbox email and confirm it
  lands on `http://<EC2_PUBLIC_IP>/verify-email?token=...` and completes.
- Open a project, trigger a deployment, and confirm the live log terminal
  streams output (this exercises the WebSocket fix through `/api/`).

## 6. Ongoing deploys

For quick fixes, re-run step 4 after `git pull origin main` on the EC2 box.
Once you're ready to use the Jenkins + Docker Hub pipeline that's already
configured (`Jenkinsfile.prod`), set up in Jenkins: `docker-hub-credentials`
and `ec2-ssh-key` credentials, then run the job with parameters `EC2_HOST`,
`EC2_SSH_USER=ubuntu`, `EC2_APP_DIR=/home/ubuntu/deploysphere-app`,
`DOCKERHUB_NAMESPACE`, `VITE_API_BASE_URL`, `VITE_WS_URL` matching what you
put in `.env.production`.

## 7. When you get a domain later

Point an A record at the (ideally Elastic) IP, then: rebuild the frontend
image with `https://yourdomain.com` values, update `.env.production`
accordingly, and set up Certbot for nginx-gateway to get real HTTPS. Ask me
when you're ready — it's a short follow-up, not a rebuild from scratch.
