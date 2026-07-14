# PMU'B/LONAB/Analysis New Chat Handoff

Use this prompt to start the new Codex chat/project for the analysis application.

```text
We are starting a new branch/application from the existing PmubLonab repo.

Project folder:
C:\Users\alion\Documents\Codex\2026-07-07\pmub-lonab-analysis

Branch:
codex/pmub-lonab-analysis

Remote repo:
https://github.com/enockmonne/PmubLonab

Product name:
PMU'B/LONAB/Analysis

Goal:
Create a separate research/intelligence application based on the same LONAB/PMU'B PDF raw data. This app is for bettors who want more historical information, context, and analysis. It must avoid direct betting recommendations.

Important decisions:
- Start from the current PmubLonab codebase and design system.
- Keep French-first UX.
- Start with the same app design and gradually reshape tabs/screens.
- Current app remains focused on programme/results viewing.
- New app focuses on search, research, historical analysis, intelligence, and insight generation from raw PDF data.
- Eventually this may become a separate GitHub repo, but for now it is a branch/worktree.
- Use a completely separate MongoDB database/cluster from the current app.
- Keep Gemini PDF parsing for now.
- Add provider fallback later if needed.
- Share the same admin login system for now.
- Add an admin product-selection screen after login:
  - PMU'B/LONAB
  - PMU'B/LONAB/Analysis
- The analysis app still needs PDF upload/import.
- Eventually ingest all historical PDFs from LONAB.

Read first:
docs/ANALYSIS_PRD.md
docs/ANALYSIS_TECHNICAL_DESIGN.md
docs/ANALYSIS_ROADMAP.md
docs/ANALYSIS_IMPLEMENTATION_KICKOFF.md
docs/PMUB_LONAB_ANALYSIS_PLAN.md
docs/PRD.md
docs/IMPLEMENTATION.md
docs/SYSTEM_DESIGN.md
docs/ARCHITECTURE.md

Recommended first task:
Inspect the repo and create the initial technical implementation plan for the analysis app:
1. Confirm branch/worktree status.
2. Add analysis-specific env examples.
3. Decide how to separate analysis database config.
4. Plan the admin product-selection screen.
5. Plan the first analysis frontend tab structure.
6. Identify which existing screens/services can be reused.
7. Produce the first small implementation PR/commit plan.

Do not modify the current production/staging app behavior unless the branch explicitly needs shared infrastructure changes.
Do not include secrets in docs.
```

## Current Known Staging Links For The Original App

- Web: https://pmublonab-staging-web.onrender.com
- Admin: https://pmublonab-staging-admin.onrender.com
- API: https://pmublonab-staging-api.onrender.com

These are for the original app. The analysis app should get separate services/URLs when deployment begins.

## Analysis Dev And Staging Guardrails

Use the analysis-specific local environment for this branch:

```powershell
.\scripts\start-analysis-dev.ps1
.\scripts\check-analysis-dev.ps1
```

If port `8081` is already occupied by an older Expo process, restart the frontend explicitly:

```powershell
.\scripts\start-analysis-dev.ps1 -RestartFrontend
```

Expected local URLs:

- Frontend: http://192.168.50.131:8081
- Backend: http://192.168.50.131:8003
- MongoDB: `pmub_analysis_mongo` on host port `27018`

Do not use the legacy `pmub_api` container on port `8001` for analysis work unless it has been recreated from this worktree. That container may belong to another checkout.

Analysis staging services are declared in `render.yaml` with separate names:

- API: `pmublonab-analysis-staging-api`
- Web: `pmublonab-analysis-staging-web`
- Admin: `pmublonab-analysis-staging-admin`

Staging should be the stable review/demo environment. Active coding should still happen locally, then be pushed and deployed to analysis staging.
