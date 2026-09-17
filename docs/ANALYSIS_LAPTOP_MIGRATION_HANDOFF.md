# PMU'B/LONAB/Analysis Laptop Migration Handoff

Verified: 2026-08-08

This document is the durable migration checklist for moving the PMU'B/LONAB/Analysis project to another Windows laptop. It contains no secrets.

## 1. Verified Project Checkpoint

- Repository: `https://github.com/enockmonne/PmubLonab`
- Product: `PMU'B/LONAB/Analysis`
- Branch: `codex/pmub-lonab-analysis`
- Implementation baseline: `75c085c` (`Bootstrap PMUB LONAB analysis app`)
- Migration handoff publication commit: `f605f2b` (`Add analysis laptop migration handoff`)
- Previous branch commit: `ab5211f` (`Add PMUB LONAB Analysis planning docs`)
- Pull request: `#88` - `https://github.com/enockmonne/PmubLonab/pull/88`
- PR state at initial verification: open draft and mergeable; documentation pushes may temporarily show checks in progress
- CI: Backend tests, Frontend checks, and Admin web build all pass
- Working tree at handoff: clean and fully pushed

The source checkout on the old laptop is:

```text
C:\Users\alion\Documents\Codex\2026-07-07\pmub-lonab-analysis
```

Do not use this folder as the source checkout:

```text
C:\Users\alion\OneDrive\Documents\PMB LONAB ANALYSIS
```

At the time of handoff, that OneDrive folder is only a placeholder/log location and does not contain the application source.

## 2. Product Scope And Decisions

- The original PMU'B/LONAB app remains focused on programmes and results.
- The Analysis product focuses on historical search, research, comparison, and explainable intelligence.
- Keep the user experience French-first.
- Avoid direct betting recommendations or certainty language.
- Reuse the existing Expo/React Native design system and PDF ingestion foundation.
- Keep Gemini as the current PDF parser; add a provider fallback only when justified.
- Use a separate MongoDB database or cluster from the original app.
- Use staging for stable review and local development for fast iteration.
- Keep Expo/React Native as the primary client; consider PWA expansion later.
- The product remains a branch/worktree for now and may become a separate repository later.

## 3. Implemented On This Branch

- Analysis-specific planning documents, PRD, technical design, roadmap, and kickoff plan.
- Product/environment flags across frontend, admin, and backend.
- Analysis frontend tabs: `Recherche`, `Chevaux`, `Courses`, `Sources`, `Analyses`.
- Analysis-specific screens currently implemented for `Recherche`, `Chevaux`, and `Sources`.
- Admin product-selection flow for PMU'B/LONAB and PMU'B/LONAB/Analysis.
- Analysis admin dashboard route and product-aware navigation.
- Separate local Docker API and MongoDB stack.
- Local start and environment verification scripts.
- Separate Render service declarations in `render.yaml`.
- Analysis environment examples for backend, frontend, and admin.

## 4. Current Environment Status

### Local Analysis Stack

- Frontend: port `8081`
- Backend API: port `8003`
- MongoDB host port: `27018`
- API container: `pmub_analysis_api`
- MongoDB container: `pmub_analysis_mongo`
- Local database: `pmub_analysis_dev`

The launcher defaults to the old laptop LAN address `192.168.50.131`. The new laptop will probably receive a different address. Pass the new address to the scripts instead of assuming the old one still works.

### Analysis Staging

The following services are declared in `render.yaml`:

- `pmublonab-analysis-staging-api`
- `pmublonab-analysis-staging-web`
- `pmublonab-analysis-staging-admin`

On 2026-08-08, all three expected analysis staging URLs returned `404 Not Found`. Treat analysis staging as not provisioned or not currently available:

- `https://pmublonab-analysis-staging-api.onrender.com`
- `https://pmublonab-analysis-staging-web.onrender.com`
- `https://pmublonab-analysis-staging-admin.onrender.com`

The original app staging services are separate and must not be used as the Analysis backend or database.

## 5. Files That Do Not Move Through Git

Recreate or transfer these securely. Never commit them:

- Local `.env` and `.env.local` files.
- MongoDB Atlas credentials and connection strings.
- Gemini API key.
- JWT secret.
- Admin email, password, and passcode.
- Beta access codes, if used.
- Expo/EAS project ID and credentials, if native testing is enabled.
- Render account access and environment secrets.
- Local PDFs or test fixtures that are not tracked by Git.
- Docker volumes and the local MongoDB dataset.

Use a password manager or another encrypted transfer method. Do not send secrets through GitHub, this document, screenshots, or ordinary chat messages.

Environment variable names and placeholders are documented in:

- `backend/.env.analysis.example`
- `frontend/.env.analysis.example`
- `admin-web/.env.analysis.example`
- `render.yaml`

## 6. Optional Local Database Migration

The local Docker MongoDB volume does not move with the repository. A fresh analysis database is acceptable if the data can be reimported from PDFs.

If the existing local analysis data must be preserved, create a compressed backup on the old laptop before migration:

```powershell
docker exec pmub_analysis_mongo mongodump --db pmub_analysis_dev --archive=/tmp/pmub-analysis.archive --gzip
docker cp pmub_analysis_mongo:/tmp/pmub-analysis.archive C:\tmp\pmub-analysis.archive
```

The archive is compressed, not encrypted. Put it in an encrypted container or use another encrypted transfer method. After starting the analysis stack on the new laptop, restore it with:

```powershell
docker cp C:\tmp\pmub-analysis.archive pmub_analysis_mongo:/tmp/pmub-analysis.archive
docker exec pmub_analysis_mongo mongorestore --db pmub_analysis_dev --archive=/tmp/pmub-analysis.archive --gzip --drop
```

The `--drop` option replaces collections in the target local database. Use it only for a fresh or intentionally replaceable local environment. Delete the unencrypted local archive after confirming the restore.

## 7. New Laptop Prerequisites

Install and configure:

1. Git for Windows.
2. GitHub CLI (`gh`) and authenticate with `gh auth login`.
3. Docker Desktop with the WSL 2 backend, then wait until Docker is running.
4. Node.js 22 LTS. Render is configured to use Node 22.
5. Corepack/Yarn 1.22.22 for the Expo frontend.
6. Codex and access to the same GitHub repository.

Python is not required for the normal local stack because the backend runs in Docker. The backend Dockerfile uses Python 3.12.

## 8. Clone And Restore The Checkout

Choose a normal local development folder that is not synchronized by OneDrive. Example:

```powershell
New-Item -ItemType Directory -Force C:\Users\<NEW_USER>\Documents\Codex
Set-Location C:\Users\<NEW_USER>\Documents\Codex
git clone https://github.com/enockmonne/PmubLonab.git pmub-lonab-analysis
Set-Location .\pmub-lonab-analysis
git switch codex/pmub-lonab-analysis
git pull --ff-only
git status
git log -3 --oneline
```

Expected checkpoint:

- Branch: `codex/pmub-lonab-analysis`
- History contains implementation baseline `75c085c` and migration handoff commit `f605f2b`
- Working tree: clean

Install dependencies:

```powershell
Set-Location frontend
corepack enable
corepack prepare yarn@1.22.22 --activate
yarn install --frozen-lockfile

Set-Location ..\admin-web
npm ci

Set-Location ..
```

## 9. Start The Local Analysis App

Find the new laptop's LAN IPv4 address:

```powershell
ipconfig
```

From the repository root, replace `<NEW_LAN_IP>` with that address:

```powershell
.\scripts\start-analysis-dev.ps1 -HostAddress "<NEW_LAN_IP>" -RestartFrontend
.\scripts\check-analysis-dev.ps1 -HostAddress "<NEW_LAN_IP>"
```

On macOS or Linux, use the equivalent portable scripts:

```bash
./scripts/start-analysis-dev.sh --host-address "<NEW_LAN_IP>" --restart-frontend
./scripts/check-analysis-dev.sh --host-address "<NEW_LAN_IP>"
```

Both launchers require `backend/.env`, recreated securely from
`backend/.env.analysis.example`. They derive local CORS origins from the supplied
LAN address, so no address should be hard-coded in Compose.

Expected URLs:

```text
Frontend: http://<NEW_LAN_IP>:8081
Backend:  http://<NEW_LAN_IP>:8003
```

The start script launches the analysis API, MongoDB, and Expo frontend. It does not launch the Vite admin app. To run admin locally, create `admin-web/.env.local` from the example with the local API URL, then run:

```powershell
Set-Location admin-web
npm run dev -- --host 0.0.0.0 --port 5179
```

Local admin URL:

```text
http://<NEW_LAN_IP>:5179
```

On macOS or Linux, the admin command is the same after changing directories:

```bash
cd admin-web
npm run dev -- --host 0.0.0.0 --port 5179
```

## 10. Validation After Migration

Run these checks before continuing feature work:

```powershell
.\scripts\check-analysis-dev.ps1 -HostAddress "<NEW_LAN_IP>"
docker compose -f docker-compose.analysis.yml config --quiet
python -m py_compile backend\server.py

Set-Location frontend
npx tsc --noEmit
npx expo lint

Set-Location ..\admin-web
npm run build

Set-Location ..
git diff --check
git status --short
```

On macOS or Linux, replace the first command with:

```bash
./scripts/check-analysis-dev.sh --host-address "<NEW_LAN_IP>"
```

If Python is not installed locally, skip `python -m py_compile`; the Docker/API check still validates backend startup.

Confirm manually:

- The frontend opens and shows the Analysis tab names.
- `Recherche`, `Chevaux`, and `Sources` render without a runtime error.
- The API is reached on port `8003`, not the original app's port `8001`.
- The running containers are `pmub_analysis_api` and `pmub_analysis_mongo`.
- The backend uses `APP_PRODUCT=analysis` and an analysis-specific `DB_NAME`.
- Admin login reaches product selection, then the Analysis area.
- No secrets or local environment files appear in `git status`.

## 11. Known Traps

- Do not use a legacy `pmub_api` container on port `8001` for Analysis work.
- Start Docker Desktop before running the launcher.
- Port `8081` may be held by an old Expo process; use `-RestartFrontend` deliberately.
- The old hard-coded LAN IP will probably be wrong on the new laptop; pass `-HostAddress`.
- A new Docker volume starts with an empty Analysis database. Empty research results can mean data has not been restored/imported, not that the UI is broken.
- OneDrive-backed development folders can cause cache and filesystem problems; keep the active clone outside OneDrive.
- Do not merge PR #88 merely to complete the laptop migration. The merge/product-repository decision is separate.
- Analysis Render services require separate secrets and a separate MongoDB database before deployment.

## 12. Immediate Next Work

1. Complete and validate the migration on the new laptop.
2. Decide whether PR #88 should remain an isolated long-lived branch, merge into `main`, or move to a separate repository.
3. Provision the three Analysis Render staging services and configure secrets.
4. Create or select the separate Analysis MongoDB Atlas database/cluster.
5. Implement the Analysis-specific `Courses` screen.
6. Implement the Analysis-specific `Analyses` screen.
7. Import a small, representative historical PDF dataset and validate search/statistics quality.
8. Add bulk-ingest quality reporting, deduplication review, and parser failure handling.

## 13. Read Order On The New Laptop

1. `docs/ANALYSIS_LAPTOP_MIGRATION_HANDOFF.md`
2. `docs/PMUB_LONAB_ANALYSIS_HANDOFF.md`
3. `docs/ANALYSIS_PRD.md`
4. `docs/ANALYSIS_TECHNICAL_DESIGN.md`
5. `docs/ANALYSIS_ROADMAP.md`
6. `docs/ANALYSIS_IMPLEMENTATION_KICKOFF.md`
7. `docs/PMUB_LONAB_ANALYSIS_PLAN.md`
8. `docs/ARCHITECTURE.md`
9. `docs/SYSTEM_DESIGN.md`

`docs/IMPLEMENTATION.md` primarily describes the original PMU'B/LONAB app. Use the Analysis-specific documents above as the control documents for this branch.

## 14. Resume Prompt For Codex

Paste this into a new Codex task after opening the cloned repository:

```text
Continue the PMU'B/LONAB/Analysis project from the laptop migration handoff.

Repository: https://github.com/enockmonne/PmubLonab
Branch: codex/pmub-lonab-analysis
Expected checkpoint: branch contains implementation baseline 75c085c and migration handoff commit f605f2b; draft PR #88

Read first:
- docs/ANALYSIS_LAPTOP_MIGRATION_HANDOFF.md
- docs/PMUB_LONAB_ANALYSIS_HANDOFF.md
- docs/ANALYSIS_PRD.md
- docs/ANALYSIS_TECHNICAL_DESIGN.md
- docs/ANALYSIS_ROADMAP.md

First verify the branch, working tree, PR status, Docker analysis containers, frontend port 8081, API port 8003, and analysis-specific database configuration. Do not use the original app backend on port 8001. Do not expose or commit secrets. Then continue with the highest-priority unfinished Analysis task.
```

## 15. Migration Completion Gate

The migration is complete only when all of these are true:

- The repository is cloned outside OneDrive.
- The correct branch and commit are checked out.
- GitHub CLI access works.
- Docker Desktop starts the isolated Analysis stack.
- The environment checker passes.
- Frontend and admin dependencies install reproducibly.
- The frontend, API, and admin can be opened locally.
- Required secrets are recreated securely and remain untracked.
- Important local PDFs or the optional MongoDB dump have been transferred and verified.
- PR #88 and the next product decision are understood.
