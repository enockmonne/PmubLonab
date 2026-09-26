# PMU'B/LONAB/Analysis Technical Design

Last updated: 2026-09-26

## System Shape

PMU'B/LONAB/Analysis starts from the existing PmubLonab architecture:

- Backend API: FastAPI, MongoDB, admin auth, PDF parsing, import workflows, stats endpoints.
- Frontend: Expo React Native / web with Expo Router.
- Admin web: Vite React app.
- PDF parsing: Gemini-based pipeline for now.
- Deployment target: the existing three staging services and URLs, repurposed for Analysis.

The implementation keeps the same codebase and branch while making Analysis the
single staging product. Environment and database boundaries—not duplicate admin
navigation—separate Analysis from the original production product.

## Product Boundary

Backend:

- `APP_PRODUCT=analysis` identifies analysis environments.
- `DB_NAME=pmub_analysis_<environment>` identifies the analysis database.
- Startup fails when `APP_PRODUCT=analysis` and `DB_NAME` is not analysis-specific.
- `MONGO_URL` must point to a separate MongoDB Atlas database or cluster.
- `/api/admin/status` exposes non-secret environment diagnostics for admin verification:
  - `APP_ENV`
  - `APP_PRODUCT`
  - `DB_NAME`

Frontend:

- `EXPO_PUBLIC_APP_PRODUCT=analysis` switches app identity and analysis tab labels.
- `EXPO_PUBLIC_APP_ENV=analysis-staging` identifies the analysis staging frontend.
- `EXPO_PUBLIC_BACKEND_URL` points to the analysis API.

Admin:

- `VITE_API_URL` points to the Analysis API.
- Existing login and feature-complete admin pages are reused.
- Login routes directly to the unified Analysis dashboard.
- `VITE_APP_PRODUCT=analysis` identifies the admin product mode.

## Environment Variables

Backend analysis example:

```env
APP_ENV=analysis-staging
APP_PRODUCT=analysis
MONGO_URL=<analysis mongo url>
DB_NAME=pmub_analysis_staging
JWT_SECRET=<analysis-only secret>
ADMIN_EMAIL=<admin email>
ADMIN_PASSWORD=<analysis-only password>
GEMINI_API_KEY=<analysis/staging key>
GEMINI_MODEL=gemini-2.5-flash
CORS_ORIGINS=<analysis web url>,<analysis admin url>
```

Frontend analysis example:

```env
EXPO_PUBLIC_APP_ENV=analysis-staging
EXPO_PUBLIC_APP_PRODUCT=analysis
EXPO_PUBLIC_BACKEND_URL=<analysis api url>
EXPO_PUBLIC_ADMIN_WEB_URL=<analysis admin url>
```

Admin analysis example:

```env
VITE_API_URL=<analysis api url>
VITE_BASE=/
```

## Data Separation

Analysis must not use the original app staging or production database.

Required separation:

- Separate `MONGO_URL` or at minimum separate database name.
- Separate `JWT_SECRET`.
- Existing staging services and URLs are reused for Analysis; duplicate Analysis service declarations are not maintained.
- CORS is limited to the active staging web/admin URLs and approved local development origins.
- Separate admin password/secret values.

Optional later separation:

- Separate GitHub repo.
- Separate MongoDB cluster.
- Separate parser credentials or quota pool.
- Separate storage bucket if original PDFs are retained.

## Staging Deployment Decision

As of 2026-09-21, Analysis replaces the original product experience at the existing staging URLs:

- Web: `https://pmublonab-staging-web.onrender.com`
- Admin: `https://pmublonab-staging-admin.onrender.com`
- API: `https://pmublonab-staging-api.onrender.com`

The existing API service uses `DB_NAME=pmub_analysis_staging`. The prior `pmub_staging` database is not reused or deleted. Production remains unchanged.

## Reused Backend Services

Reuse immediately:

- PDF upload and parse flow.
- Gemini parser integration.
- LONAB archive preview/import flow.
- File hash dedupe.
- Programme/result linking.
- Race library endpoints.
- Search endpoint.
- Stats endpoints.
- Admin auth and audit logs.

Extend next:

- Horse-centric indexes and profile endpoints.
- Source/media performance endpoints.
- Similar race lookup endpoint.
- Parse quality review endpoints.
- Import retry/filter endpoints.
- Admin correction endpoints for race metadata.

## Search And Indexing Plan

Initial search can reuse existing `/api/search`.

Next backend improvements:

- Normalize horse, jockey, trainer, owner, and source names.
- Add text/compound indexes for common research queries.
- Store accent-insensitive normalized keys.
- Support filters by:
  - date range
  - doc type
  - race type
  - discipline
  - distance
  - location
  - source/media

Future search features:

- Fuzzy matching for spelling variants.
- Horse alias handling.
- Similar race profiles.
- Saved research queries.

## Analysis Frontend

Product mode is controlled by `frontend/src/product.ts`.

Analysis tabs:

- `Recherche`: search and research landing.
- `Chevaux`: horse profiles and history.
- `Courses`: historical race explorer.
- `Sources`: media/pronostic performance.
- `Analyses`: statistical context and summaries.

The first implementation uses the same underlying route files where practical, then replaces each tab with purpose-built screens.

Current purpose-built screens:

- `Recherche`
- `Chevaux`
- `Sources`

The next replacement is `Courses`. See
`docs/ANALYSIS_COURSES_IMPLEMENTATION_PLAN.md` for its scope, data contract,
states, and acceptance criteria.

## Validated Local Development Boundary

The migration baseline was revalidated on macOS with:

- Frontend on `8081`.
- API on `8003` in `pmub_analysis_api`.
- MongoDB on `27018` in `pmub_analysis_mongo`.
- Database `pmub_analysis_dev`.
- Credentials loaded from ignored `backend/.env` rather than Compose defaults.
- CORS derived from the LAN address supplied to the launcher.
- Matching programme/result PDFs automatically linked by the existing backend.

Windows uses `scripts/start-analysis-dev.ps1` and
`scripts/check-analysis-dev.ps1`. macOS/Linux uses the matching `.sh` scripts.

## Analysis Admin

Current implementation:

- One Analysis admin experience uses the canonical root routes.
- `/dashboard` combines operational metrics with the Analysis product focus.
- Upload, LONAB import, corpus races, announcements, beta access, activity, and settings remain available.
- `/products` and legacy `/analysis/*` URLs redirect to their canonical equivalents.
- The removed product selector cannot switch the admin away from the Analysis API.
- Race administration supports audited manual programme/result linking and unlinking.

Next admin work:

- Add analysis-specific import dashboard.
- Add parse-quality review.
- Add imported/skipped/error filters.
- Add retry action for failed PDFs.
- Done: add manual programme/result link correction that survives automatic rebuilds.
- Add data coverage summaries.

## AI And Parsing Strategy

Keep Gemini for now.

Near-term rules:

- Use deterministic extraction where possible for mechanical tables.
- Use LLM parsing for narrative or complex PDF sections.
- Store parse quality and warnings.
- Do not generate betting advice.

Future provider fallback:

- Gemini primary.
- Add OCR/LLM fallback only after observed parse failures justify it.
- Preserve provider, retry, and error details for admin review.

## Deployment Shape

Analysis reuses the existing staging service names and URLs:

- `pmublonab-staging-api`
- `pmublonab-staging-web`
- `pmublonab-staging-admin`

Deploy only after:

- Analysis env vars are configured.
- Analysis database is ready.
- Unified admin and frontend Analysis identity are visible.
- API/admin status confirms `APP_PRODUCT=analysis` and `DB_NAME=pmub_analysis_staging`.

## Verification

Before merging/deploying analysis changes:

- `npm run build` in `admin-web`.
- `npx expo lint` in `frontend`.
- `npx tsc --noEmit` in `frontend`.
- `python -m py_compile backend/server.py`.
- Backend tests when API behavior changes.
- Manual check that login reaches the unified dashboard, legacy URLs redirect, and Analysis tabs route correctly.

## Risks

- Accidentally pointing analysis at the original database.
- Reused screens retaining too much original-app language.
- Historical imports creating duplicates or low-confidence records.
- AI summaries overstating limited data.
- Search becoming slow without indexes as historical data grows.

## Technical Open Questions

- Should analysis use a fully separate MongoDB cluster or a separate database in one cluster first?
- Should original PDFs be stored long-term?
- Which fields need dedicated indexes before importing more than a few months of history?
- Should public analysis launch be PWA/web only first?
- Should generated summaries be precomputed or generated on demand?
