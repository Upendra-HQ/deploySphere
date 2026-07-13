# DeploySphere Setup & Installation Guide

## Local Development

### Requirements

- Node.js 18+
- npm
- Docker Desktop for Docker-related features

### Backend

Create `backend/.env`:

```env
PORT=5000
DATABASE_URL="file:./dev.db"
JWT_SECRET="change-this-local-dev-secret"
EMAIL_SERVICE="mock"
```

Then run:

```bash
cd backend
npm install
npx prisma generate
npm run dev
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`.

## Production Deployment With Docker Compose

1. Copy the production env example:

```bash
cp .env.production.example .env.production
```

2. Edit `.env.production` and set real values:

```env
POSTGRES_USER=deploysphere_admin
POSTGRES_PASSWORD=<strong-postgres-password>
POSTGRES_DB=deploysphere_prod
DATABASE_URL=postgresql://deploysphere_admin:<strong-postgres-password>@postgres-db:5432/deploysphere_prod?schema=public
JWT_SECRET=<long-random-secret>
FRONTEND_URL=https://your-frontend-domain.com
BACKEND_URL=https://your-api-domain.com
CORS_ORIGINS=https://your-frontend-domain.com
VITE_API_BASE_URL=https://your-api-domain.com
VITE_WS_URL=wss://your-api-domain.com
```

3. Start production services:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

The production backend uses PostgreSQL through `backend/prisma/schema.postgres.prisma`.

## AWS EC2 Helper

On a fresh Ubuntu EC2 instance:

```bash
REPO_URL=https://github.com/<your-user>/<your-repo>.git ./deploy-ec2.sh
```

The script creates `.env.production` from `.env.production.example` and stops so you can fill real secrets before launching containers.

## Optional Services

Monitoring:

```bash
docker compose -f monitoring/docker-compose.yml up -d
```

Gateway-only local Nginx:

```bash
docker compose -f nginx/docker-compose.yml up -d
```
