# PMU'B/LONAB/Analysis Implementation Kickoff

Last updated: 2026-08-29

## Post-Migration Update

The migration gate is complete. Local Analysis services, credentials, admin
selection, frontend screens, CI, and representative programme/result parsing
have been validated on the new laptop. Portable macOS/Linux scripts now mirror
the Windows workflow.

The next implementation slice is no longer environment bootstrap. It is the
purpose-built historical `Courses` screen described in
`docs/ANALYSIS_COURSES_IMPLEMENTATION_PLAN.md`.

## Current Branch Snapshot

- Worktree: `C:\Users\alion\Documents\Codex\2026-07-07\pmub-lonab-analysis`
- Branch: `codex/pmub-lonab-analysis`
- Remote tracking branch: `origin/codex/pmub-lonab-analysis`
- Starting point: existing PmubLonab codebase and design system.
- Product direction: separate research and intelligence application using the same LONAB/PMU'B PDF raw data.

## First Technical Decisions

- Keep the backend, Expo frontend, and Vite admin structure for the first iteration.
- Keep Gemini PDF parsing for now.
- Keep the existing admin authentication foundation for now.
- Use a separate MongoDB Atlas database or cluster for analysis data.
- Use `DB_NAME=pmublonab_analysis` for analysis environments.
- Add `APP_PRODUCT=analysis` to analysis backend environments as an explicit product marker, even though the current backend does not yet branch behavior on it.
- Keep analysis Render services separate from the original staging services:
  - `pmublonab-analysis-api`
  - `pmublonab-analysis-web`
  - `pmublonab-analysis-admin`

## Environment Separation

Analysis env examples now live at:

- `backend/.env.analysis.example`
- `frontend/.env.analysis.example`
- `admin-web/.env.analysis.example`

The backend already reads `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `GEMINI_API_KEY`, `GEMINI_MODEL`, and `CORS_ORIGINS`.

The plan originally used `ADMIN_BOOTSTRAP_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD`; the current code uses `ADMIN_EMAIL` and `ADMIN_PASSWORD`, so the analysis examples keep the existing code contract.

## Admin Product Selection Plan

Goal: keep one admin login foundation, then route the admin to the correct product area.

First implementation shape:

- After login, show a product selector screen.
- Product cards:
  - `PMU'B/LONAB`
  - `PMU'B/LONAB/Analysis`
- Selecting `PMU'B/LONAB` routes to the existing dashboard.
- Selecting `PMU'B/LONAB/Analysis` routes to a new analysis admin dashboard.
- Keep upload/import available in the analysis area because historical PDF ingest is core to the product.

Implementation notes:

- Add a product selection route in `admin-web/src/App.tsx`.
- Store the selected product in local storage.
- Keep protected routes behind the existing auth guard.
- Do not remove existing admin pages; reuse them from the analysis area where they still apply.

## First Analysis Frontend Tab Structure

Start with a small tab rename/reframe, then replace screens gradually.

Initial target tabs:

- `Recherche`: search and research landing.
- `Chevaux`: horse profiles and history.
- `Courses`: historical race explorer.
- `Sources`: media/pronostic source performance.
- `Analyses`: summaries and statistical context.

Reusable existing frontend surfaces:

- `frontend/app/search.tsx`
- `frontend/app/horse-history/[name].tsx`
- `frontend/app/compare.tsx`
- `frontend/app/(tabs)/stats.tsx`
- `frontend/src/raceInsight.ts`
- `frontend/src/mediaInsight.ts`
- `frontend/src/PerformanceChart.tsx`

## Reusable Backend Services

Reuse first:

- PDF upload and parse flow.
- LONAB archive preview/import flow.
- Duplicate detection by file hash.
- Programme/result linking.
- Stats endpoints that already compare programme data to linked official results.
- Pronostic source normalization.

Extend later:

- Horse-centric search indexes.
- Jockey/trainer historical aggregates.
- Source/media accuracy endpoints.
- Similar race lookup.
- Parse quality and missing-field review screens.

## First Small PR Plan

1. Done: add analysis env examples and this kickoff document.
2. Done: add app/product naming constants for frontend and admin.
3. Done: add admin product selector after login.
4. Done: add analysis admin route group that initially reuses upload/import/log pages.
5. Done: introduce the first analysis frontend tab structure without deleting original screens.
6. Done: add lightweight backend health/config response fields for `APP_PRODUCT` and `DB_NAME` visibility in admin diagnostics.
7. Next: prepare separate Render service names after the first UI split is visible.
8. In progress: replace reused analysis tabs with purpose-built research screens one at a time.
   - Done: `Recherche` now has an analysis-specific research landing backed by existing races/search APIs.

## Guardrails

- Do not point analysis services at the current staging or production MongoDB database.
- Do not copy secrets into docs or env examples.
- Do not change original staging service URLs unless intentionally deploying the analysis branch.
- Avoid direct betting recommendations in UI copy and generated summaries.
- Keep French-first labels and states.
