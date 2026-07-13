# DeploySphere PaaS

DeploySphere is a developer-focused platform for deploying applications, streaming build logs, managing Docker runtimes, routing traffic through Nginx, provisioning SSL, and monitoring infrastructure.

## Features

- Authentication with email verification and password reset
- Project configuration with repository, branch, framework, build/start commands, environment variables, and deployment strategy
- Deployment records, live logs, history, and rollback flow
- Docker container listing, actions, and logs
- GitHub OAuth/repository selection and webhook trigger support
- Jenkinsfile generation and optional Jenkins deployment path
- Nginx reverse proxy routing with custom domains
- SSL status/generation/deletion endpoints
- Monitoring, analytics, admin panel, and AI DevOps assistant

## Tech Stack

- Frontend: React, Vite, TypeScript, Recharts, Lucide Icons
- Backend: Node.js, Express, TypeScript, Prisma, WebSocket logs
- Local database: SQLite
- Production database: PostgreSQL
- Runtime/Gateway: Docker, Nginx
- Monitoring: Prometheus, Grafana, Node Exporter, cAdvisor

## Local Development

```bash
cd backend
npm install
npx prisma generate
npm run dev
```

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend: `http://localhost:5173`
Backend: `http://localhost:5000`

## Production Setup

1. Copy `.env.production.example` to `.env.production` on your server.
2. Replace every placeholder secret and domain.
3. Deploy with Docker Compose:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

The production Docker backend uses `backend/prisma/schema.postgres.prisma` and pushes the schema to PostgreSQL at container startup.

## Documentation

- [Installation Guide](docs/INSTALLATION_GUIDE.md)
- [REST API Docs](docs/API_DOCUMENTATION.md)
- [Architecture](docs/ARCHITECTURE.md)

## Security Notes

- Never commit `.env`, `.env.production`, database files, JWT secrets, SMTP credentials, or GitHub OAuth secrets.
- Use GitHub repository secrets or your deployment provider's environment settings for production values.
- Rotate any secret that was ever committed publicly.

