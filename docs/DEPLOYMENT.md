# TripMind — Deployment Reference

Operational guide for deploying and maintaining the backend on EC2. For the architecture
overview and infrastructure diagram, see `docs/ARCHITECTURE_OVERVIEW.md` §7.

---

## Stack

| Component | Where | How |
|---|---|---|
| Backend API | EC2 (ap-southeast-1) | Docker container via `docker-compose.prod.yml` |
| Database | RDS PostgreSQL 15 | URL in SSM at `/tripmind/prod/DATABASE_URL` |
| Frontend | Vercel | Auto-deploys from main; no manual steps |
| Secrets | AWS SSM Parameter Store | Pulled to `.env.prod` on each deploy |
| Media (photos) | S3 `tripmind-media` (ap-southeast-2) | EC2 instance role; no key rotation needed |

---

## Automated vs Manual Deployment Steps

### 1. What is automated on `git push` to `main`

The workflow at `.github/workflows/deploy-backend.yml` runs two sequential jobs:

**Job 1 — pytest gate** (blocks deploy if tests fail)
- Starts a `postgres:15` service container
- `pip install -r backend/requirements.txt -r backend/requirements-test.txt`
- `pytest tests/ -v` against the test DB
- If any test fails, Job 2 does not run

**Job 2 — deploy** (only if Job 1 passes)
- SSHs into EC2
- `git fetch origin main && git reset --hard origin/main`
- Pulls fresh secrets from SSM → writes `.env.prod`
- `docker compose -f docker-compose.prod.yml up -d --build` (rebuilds image, restarts container)
- Alembic migrations — see §2 below

---

### 2. Migration automation fix

**Current state (before fix):** The CI workflow runs migrations via `docker exec` after
the container is already up:

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker exec tripmind_backend alembic upgrade head
```

This has a window where the container is running with the old schema, and a failed
migration leaves the container running in a broken state.

**The fix — bake migrations into the startup command in `docker-compose.prod.yml`:**

```yaml
services:
  backend:
    build: .
    command: >
      sh -c "alembic upgrade head &&
             uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2"
    env_file:
      - .env.prod
    ports:
      - "8000:8000"
    volumes:
      - ./uploads:/app/uploads
```

With this in place, migrations run automatically before uvicorn starts on every container
restart — whether triggered by a CI deploy, a manual `docker compose restart`, or an
EC2 reboot.

**If the migration fails, the container does not start.** This is intentional and safer
than starting uvicorn with the wrong schema. A failed container is immediately visible
in `docker ps` (status: `Exited`) and in CloudWatch/`docker logs`.

Once this change is live, the `docker exec tripmind_backend alembic upgrade head` line
in the CI script can be removed — it will have already run inside the startup command.

---

### 3. SSM dynamic loader fix (pending)

**Current state:** The CI deploy script fetches each SSM parameter by name:

```bash
DATABASE_URL=$(aws ssm get-parameter --name "/tripmind/prod/DATABASE_URL" --with-decryption ...)
OPENAI_API_KEY=$(aws ssm get-parameter --name "/tripmind/prod/OPENAI_API_KEY" --with-decryption ...)
SECRET_KEY=$(aws ssm get-parameter --name "/tripmind/prod/SECRET_KEY" --with-decryption ...)
DEBUG=$(aws ssm get-parameter --name "/tripmind/prod/DEBUG" ...)
FRONTEND_URL=$(aws ssm get-parameter --name "/tripmind/prod/FRONTEND_URL" ...)

cat > .env.prod << EOF
DATABASE_URL=$DATABASE_URL
...
EOF
```

**Problem:** Every new config key requires a code change to the workflow file AND a
manual `.env.prod` entry added on the server. Adding `AWS_S3_BUCKET` or
`AWS_S3_REGION` to SSM right now would not be picked up automatically.

**The fix — replace with `get-parameters-by-path`:**

```bash
# Fetch all params under /tripmind/prod/ and write to .env.prod dynamically
aws ssm get-parameters-by-path \
  --path "/tripmind/prod/" \
  --with-decryption \
  --region "ap-southeast-1" \
  --query "Parameters[*].{Name:Name,Value:Value}" \
  --output json \
| python3 -c "
import json, sys
params = json.load(sys.stdin)
for p in params:
    key = p['Name'].split('/')[-1]   # strip /tripmind/prod/ prefix
    print(f\"{key}={p['Value']}\")
" > .env.prod
```

Once implemented, adding a new environment variable means:
1. Add the parameter to SSM under `/tripmind/prod/<KEY>`
2. No code changes required — it appears in `.env.prod` on the next deploy/restart

---

### 4. What still requires manual SSH (current state)

Until the SSM dynamic loader fix is implemented, these steps require SSHing into EC2:

| Task | Command |
|---|---|
| Add a new env var not yet in SSM | `echo "NEW_VAR=value" >> ~/tripmind/backend/.env.prod` |
| Add a new SSM parameter | AWS Console → Parameter Store → Create parameter under `/tripmind/prod/` |
| Verify container is healthy after deploy | `docker ps` — check status is `Up` not `Exited` |
| Inspect logs after a failed start | `docker logs tripmind_backend --tail 50` |
| Force-restart without a code push | `docker compose -f docker-compose.prod.yml restart` |
| Roll back a bad deploy | `git reset --hard <commit>` then `docker compose up -d --build` |

---

### 5. `.env.prod` — what it is and how to manage it

`.env.prod` lives on the EC2 server only at `~/tripmind/backend/.env.prod`. It is never
committed to the repo (listed in `.gitignore`). It is regenerated from SSM on every
deploy — any manual edits are overwritten on the next `git push` to `main`.

**Current contents** (as of the S3 feature):

```
DATABASE_URL=<from SSM>
OPENAI_API_KEY=<from SSM>
SECRET_KEY=<from SSM>
DEBUG=<from SSM>
FRONTEND_URL=<from SSM>
AWS_S3_BUCKET=tripmind-media          # hardcoded — not yet in SSM
AWS_S3_REGION=ap-southeast-2          # hardcoded — not yet in SSM
```

The two S3 variables are currently hardcoded in the deploy script because they were
added after the SSM loader was written. They are pending migration to SSM as part of the
dynamic loader fix (§3).

**Rule:** Any new environment variable introduced in a feature branch must be manually
added to `.env.prod` on the server **before or alongside** the deploy that needs it.
Deploying code that references a missing env var will crash the container at startup
(pydantic-settings raises on missing required fields).

---

### 6. SSM Parameter Naming Convention

All parameters must be under the `/tripmind/prod/` prefix:

```
/tripmind/prod/DATABASE_URL       ← SecureString (decrypted)
/tripmind/prod/OPENAI_API_KEY     ← SecureString (decrypted)
/tripmind/prod/SECRET_KEY         ← SecureString (decrypted)
/tripmind/prod/DEBUG              ← String
/tripmind/prod/FRONTEND_URL       ← String
```

**Do NOT create parameters at `/tripmind/` without `/prod/`.** The `get-parameters-by-path`
loader (once implemented) will call `--path "/tripmind/prod/"` — parameters at any other
path will not be found.

The parameter name becomes the env var key. The loader strips the path prefix, so
`/tripmind/prod/DATABASE_URL` becomes `DATABASE_URL` in `.env.prod`. Match exactly
what `app/config.py` expects (the field names on the `Settings` class).
