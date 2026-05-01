# Standup Tracker

A developer productivity platform that eliminates the manual effort of daily standups. It automatically pulls your GitHub activity — commits, pull requests, and code reviews — generates a structured standup draft, scores it using a multi-agent AI pipeline, and tracks your focus sessions with a Pomodoro timer.

---

## What it does

- Generates your daily standup automatically from real GitHub activity
- Scores standup quality across 4 dimensions using a 5-agent AI pipeline powered by Groq
- Tracks deep work sessions with a Pomodoro focus timer and ambient sound engine
- Sends PR review reminders when your pull requests go stale
- Posts standups directly to Slack
- Shows a 365-day GitHub contribution heatmap
- Delivers real-time notifications via WebSockets with missed-event replay

---

## Tech stack

**Frontend** — Vite + React, React Router, Socket.io client, Framer Motion, Recharts

**Backend** — Node.js, Express, Socket.io, node-cron, BullMQ

**Database** — PostgreSQL with node-pg-migrate for versioned migrations

**Cache** — Redis via ioredis

**AI** — Groq API, llama-3.1-8b-instant and llama-3.3-70b-versatile

**Infrastructure** — Docker, Nginx, Prometheus, Grafana, Loki, Promtail, AlertManager

**Testing** — Jest, Supertest, k6

**CI/CD** — GitHub Actions

---

## Architecture diagrams

### Overall flow
<img src="images/Flow.jpg" width="700" />

---

### GitHub OAuth flow
<img src="images/GitHub.jpg" width="700" />

---

### Standup generation flow
<img src="images/StandupFlow.jpg" width="700" />

---

### WebSocket notification flow
<img src="images/SocketFlow.jpg" width="700" />

---

### GitHub Actions CI/CD flow
<img src="images/GitActionsFlow.jpg" width="700" />

---

### Standup scoring flow
<img src="images/StandupScoringFlow.jpg" width="700" />

---

## Multi-agent AI scoring pipeline

When a standup is saved it is scored asynchronously via a 5-agent pipeline:

**Planner** — queries the user's past scores, personal baseline, score trend, and GitHub activity via tool calls before producing an execution plan that tells each specialist agent what to focus on.

**4 specialist agents** — run in parallel using llama-3.1-8b-instant. Each agent scores one dimension: clarity, specificity, blocker quality, and completeness. Agents receive planner context and memory from previous sessions.

**Critic** — runs on llama-3.3-70b-versatile. Reviews all four scores, identifies inconsistencies, adjusts where needed, and produces the final score, grade, strengths, and improvements.

**Memory** — after every run the system updates persistent agent memory with recurring issues and score trends. This memory is injected into the next run so assessments improve over time.

The full pipeline runs in under 2 seconds because the 4 specialist agents are parallelised using p-limit.

---

## Observability stack

The application runs a full production-grade observability stack locally via Docker:

- **Prometheus** scrapes `/metrics` every 15 seconds — request rates, error rates, p95/p99 latency, DB query duration, cache hit rate, WebSocket connections, and queue job counts
- **Grafana** visualises all metrics in real time — dashboards show live data during k6 load tests
- **Loki + Promtail** — structured JSON logs are shipped to Loki and queryable in Grafana alongside metrics
- **AlertManager** — fires Slack alerts when error rate exceeds 5%, p99 latency crosses 2 seconds, or any service instance goes down

---

## Rate limiting

Three layers of rate limiting protect the API:

- **Nginx** — network-level throttling, 100 requests/minute per IP, 20 concurrent connections per IP
- **Express global limiter** — 200 requests/minute per IP via Redis-backed express-rate-limit
- **Per-route limiters** — auth routes capped at 10 requests per 15 minutes, GitHub generate endpoint capped at 10 requests per hour per user
- **Speed limiter** — adds progressive delays above 50 requests/minute to discourage scrapers without hard-blocking

---

## Database migrations

Schema changes are managed with node-pg-migrate. Every change is a numbered versioned file with explicit up and down functions. Migrations run automatically on server startup.

```bash
# Apply all pending migrations
npm run migrate:up

# Roll back the last migration
npm run migrate:down

# Create a new migration
npm run migrate:create -- <your_migration_name>

# Check migration status
npm run migrate:status
```

---

## Running locally

**Prerequisites** — Docker Desktop (4GB RAM minimum), Node.js 20, k6 (for load tests)

```bash
# Clone the repo
git clone https://github.com/bitgladiator/standup-tracker.git
cd standup-tracker

# Start Postgres, Redis, and the observability stack
docker-compose up -d

# Install server dependencies and run migrations
cd server && npm install && npm run migrate:up

# Install client dependencies
cd ../client && npm install

# Add environment variables
cp server/.env.example server/.env
# Fill in GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GROQ_API_KEY, JWT_SECRET
```

Create a GitHub OAuth app at github.com/settings/developers with:
- Homepage URL: `http://localhost:5173`
- Callback URL: `http://localhost:5500/api/auth/callback`

```bash
# Start the server
cd server && npm run dev

# Start the client
cd client && npm run dev
```

Open `http://localhost:5173`

---

## Environment variables

```env
PORT=5500
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/standup_tracker
REDIS_URL=redis://localhost:6379
JWT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
CLIENT_URL=http://localhost:5173
GROQ_API_KEY=
```

---

## Running tests

```bash
cd server

# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# Coverage report
npm run test:coverage
```

```bash
# Load tests — server must be running
k6 run server/tests/load/smoke.js
k6 run server/tests/load/stress.js
k6 run server/tests/load/spike.js
```

---

## Observability dashboards

| Tool | URL | Credentials |
|---|---|---|
| Grafana | http://localhost:3001 | admin / admin123 |
| Prometheus | http://localhost:9090 | none |
| AlertManager | http://localhost:9093 | none |
| Bull queue dashboard | http://localhost:5500/admin/queues | none |
| Raw metrics | http://localhost:5500/metrics | none |

---

## CI/CD

Every push to main triggers the GitHub Actions pipeline:

- Spins up real Postgres and Redis service containers
- Runs unit and integration tests
- Enforces 70% coverage threshold
- Runs npm audit at high severity level
- Scans for secrets with TruffleHog
- Builds the Docker image and tags it with the git SHA
- Blocks deployment if any check fails
