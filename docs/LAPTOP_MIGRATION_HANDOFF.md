# PMU'B/LONAB Laptop Migration Handoff

Verified: 2026-08-08

This document is the durable checklist for moving the PMU'B/LONAB project to a new Windows laptop. It contains no secrets.

## 1. Repository Checkpoint

- Repository: `https://github.com/enockmonne/PmubLonab`
- Original app branch: `main`
- Original app checkpoint: `755e9f6` (`Merge pull request #87 from enockmonne/codex/remove-archive-rapports-filter`)
- Original app source folder on old laptop:

```text
C:\Users\alion\Documents\Codex\2026-05-05\please-analyze-the-entire-code-base\PmubLonab
```

- Analysis app branch/worktree:

```text
C:\Users\alion\Documents\Codex\2026-07-07\pmub-lonab-analysis
```

- Analysis branch: `codex/pmub-lonab-analysis`
- Analysis PR: `#88` - `https://github.com/enockmonne/PmubLonab/pull/88`
- Analysis PR status on 2026-08-08: open draft, clean, CI passing.

## 2. Open PRs To Know About

As of this handoff, these PRs were open:

- `#88` `Bootstrap PMUB LONAB analysis app` - draft analysis application branch.
- `#81` `Add manual programme result link override` - original app admin/backend enhancement.
- `#76` `Document PWA-first monetization path` - original app documentation.

Before doing new work on the new laptop, run:

```powershell
gh pr list --state open
```

## 3. Product Split

There are now two related work streams:

### Original PMU'B/LONAB App

Purpose:

- view current and historical programmes
- view partants, pronostics, results, reports, stats, and archives
- support staging tester access through beta codes
- prepare for paid access and Burkina Faso launch

Control docs:

- `docs/PRD.md`
- `docs/IMPLEMENTATION.md`
- `docs/SYSTEM_DESIGN.md`
- `docs/ARCHITECTURE.md`
- `docs/DEPLOYMENT.md`
- `docs/QA_CHECKLIST.md`

### PMU'B/LONAB/Analysis App

Purpose:

- branch/product line focused on search, research, historical analysis, and intelligence from raw PDF data
- not direct betting recommendations
- separate MongoDB database/cluster
- same admin login foundation for now
- eventual separate repository

Control docs in the Analysis branch:

- `docs/ANALYSIS_LAPTOP_MIGRATION_HANDOFF.md`
- `docs/PMUB_LONAB_ANALYSIS_HANDOFF.md`
- `docs/PMUB_LONAB_ANALYSIS_PLAN.md`
- `docs/ANALYSIS_PRD.md`
- `docs/ANALYSIS_TECHNICAL_DESIGN.md`
- `docs/ANALYSIS_ROADMAP.md`
- `docs/ANALYSIS_IMPLEMENTATION_KICKOFF.md`

## 4. Staging Links For The Original App

- Web: `https://pmublonab-staging-web.onrender.com`
- Admin: `https://pmublonab-staging-admin.onrender.com`
- API: `https://pmublonab-staging-api.onrender.com`

The Analysis app should receive separate services and URLs. Do not point the Analysis branch at the original app staging database.

## 5. Secrets And Files That Do Not Move Through Git

Recreate or transfer these securely. Do not commit them:

- `backend/.env`
- `frontend/.env`
- `frontend/.env.local`
- `admin-web/.env`
- `admin-web/.env.local`
- MongoDB Atlas URLs and passwords
- Gemini API key
- JWT secret
- admin email/password/passcode
- beta access codes
- Expo/EAS project id and native credentials
- Render environment variables
- local PDFs or test fixtures that are not tracked by Git
- local Docker MongoDB volumes

Use a password manager or encrypted transfer. Do not paste secrets into GitHub, docs, screenshots, or ordinary chat messages.

## 6. New Laptop Prerequisites

Install:

1. Git for Windows.
2. GitHub CLI, then authenticate:

```powershell
gh auth login
```

3. Docker Desktop with WSL 2 backend.
4. Node.js 22 LTS.
5. Corepack/Yarn:

```powershell
corepack enable
corepack prepare yarn@1.22.22 --activate
```

6. Python 3.12 if you want to run backend checks outside Docker.
7. Codex desktop/app access.

Prefer a local development folder outside OneDrive to avoid cache/filesystem issues.

## 7. Clone Original App On The New Laptop

Example:

```powershell
New-Item -ItemType Directory -Force C:\Users\<NEW_USER>\Documents\Codex
Set-Location C:\Users\<NEW_USER>\Documents\Codex
git clone https://github.com/enockmonne/PmubLonab.git PmubLonab
Set-Location .\PmubLonab
git switch main
git pull --ff-only
git status
git log -3 --oneline
```

Expected:

- branch: `main`
- clean working tree
- latest known checkpoint at or after `755e9f6`

Install dependencies:

```powershell
Set-Location frontend
yarn install --frozen-lockfile

Set-Location ..\admin-web
npm ci

Set-Location ..
```

## 8. Local Original App Environment

Create local env files from examples:

- `backend/.env.example` -> `backend/.env`
- `frontend/.env.example` -> `frontend/.env`
- `admin-web/.env.example` -> `admin-web/.env`

Development defaults from `ENVIRONMENTS.md`:

- Backend API: `http://localhost:8001/api`
- Frontend Expo web: set `EXPO_PUBLIC_BACKEND_URL=http://localhost:8001`
- Admin web: set `VITE_API_URL=http://localhost:8001`
- Optional beta gate: `EXPO_PUBLIC_BETA_ACCESS_REQUIRED=false` disables the access gate locally.

Start backend/MongoDB:

```powershell
docker compose -f docker-compose.dev.yml up --build
```

Start frontend:

```powershell
Set-Location frontend
yarn web
```

Start admin:

```powershell
Set-Location admin-web
npm run dev
```

## 9. Local Original App Validation

Run:

```powershell
python -m py_compile backend\server.py

Set-Location frontend
yarn lint
npx tsc --noEmit

Set-Location ..\admin-web
npm run build

Set-Location ..
git diff --check
git status --short
```

If Python is not installed locally, rely on Docker/API startup and CI until Python is installed.

## 10. Restore The Analysis Worktree On The New Laptop

The Analysis app is currently a branch in the same repository. You can either clone a second folder or create a worktree.

Simple second-folder clone:

```powershell
Set-Location C:\Users\<NEW_USER>\Documents\Codex
git clone https://github.com/enockmonne/PmubLonab.git pmub-lonab-analysis
Set-Location .\pmub-lonab-analysis
git switch codex/pmub-lonab-analysis
git pull --ff-only
git status
```

Or from the original clone:

```powershell
Set-Location C:\Users\<NEW_USER>\Documents\Codex\PmubLonab
git worktree add ..\pmub-lonab-analysis codex/pmub-lonab-analysis
```

Then read:

```text
docs/ANALYSIS_LAPTOP_MIGRATION_HANDOFF.md
```

That document contains the Analysis-specific Docker ports, scripts, local DB, and restore steps.

## 11. Beta Access Reminder

The beta code system is configured by environment variables:

Backend:

```env
BETA_ACCESS_CODES=CODE1,CODE2,CODE3
```

Frontend:

```env
EXPO_PUBLIC_BETA_ACCESS_REQUIRED=true
```

Codes are tracked by anonymous device id after a tester enters a valid code. Admin usage is visible at:

```text
Admin -> Acces beta
```

Current limitation: this tracks successful code usage, not every anonymous link click.

## 12. New Laptop Resume Prompt For Codex

Paste this into the first new Codex chat for the original app:

```text
Continue the PMU'B/LONAB project after laptop migration.

Repo: https://github.com/enockmonne/PmubLonab
Original app branch: main
Expected original-app checkpoint: at or after 755e9f6

Local checkout:
C:\Users\<NEW_USER>\Documents\Codex\PmubLonab

Read first:
- docs/LAPTOP_MIGRATION_HANDOFF.md
- docs/IMPLEMENTATION.md
- docs/PRD.md
- docs/SYSTEM_DESIGN.md
- docs/ARCHITECTURE.md
- ENVIRONMENTS.md

Before editing, verify:
- git status --short
- git branch --show-current
- gh pr list --state open
- Docker availability
- frontend/admin dependencies
- env files exist locally but are not tracked

Do not commit secrets. Do not use the old OneDrive folder as the active source checkout.
```

For the Analysis app, use the resume prompt inside:

```text
docs/ANALYSIS_LAPTOP_MIGRATION_HANDOFF.md
```

## 13. Migration Completion Gate

Migration is complete only when:

- original app repo is cloned outside OneDrive
- Analysis branch/worktree is restored if needed
- `gh auth status` works
- dependencies install in `frontend` and `admin-web`
- Docker Desktop can start the dev stack
- required `.env` files are recreated securely
- no `.env` or secrets appear in `git status`
- original app staging links are known
- Analysis PR #88 and its separate database requirement are understood
- Codex can read the project folder and run basic validation commands
