# Implementation Plan

Last updated: 2026-05-27

This is the living project control document for PmubLonab. Use it to track what is live, what is in progress, what should be done next, and which decisions have already been made.

## Current Status

- Emergent runtime dependency has been removed.
- Backend uses direct Gemini API integration for PDF parsing.
- Dev/test/staging environment scaffolding exists.
- Render staging is live:
  - API: https://pmublonab-staging-api.onrender.com
  - Web app: https://pmublonab-staging-web.onrender.com
  - Admin web: https://pmublonab-staging-admin.onrender.com
- MongoDB Atlas staging database is connected.
- GitHub Actions CI is configured for backend tests, frontend checks, and admin web build.
- Push notification foundation exists, but physical Android testing is still pending.
- "Arret des jeux" display is fixed and verified in staging.
- Results embedded in course PDFs are now surfaced on the Resultats screen.
- "Voir tous les rapports" now uses a results-focused detail view.
- The implementation tracker exists at `docs/IMPLEMENTATION.md`.
- Cached Programmes and Resultats data can hydrate repeat app opens before background refresh.
- Admin uploads now show a post-upload validation summary for extracted horses, pronostics, rapports, and Arret des jeux.
- Horse detail pages now include a compact Horse Intelligence panel.
- Programmes now include a Race Insight Summary built from structured consensus and form signals.
- Pronostics now include media agreement, base spread, and outlier context.
- Admin now has a LONAB archive preview screen for discovering PDF links before bulk import.
- LONAB archive imports can now download selected PDFs, hash them for deduplication, parse them, and report per-file results.

## Active PRs

- LONAB Selected Import v1
  - Status: in progress on branch `codex-lonab-import-selected-v1`.
  - Purpose: import selected LONAB PDFs with download, SHA-256 dedupe, parsing, and per-file reporting.

## Immediate Next Steps

1. Open PR for LONAB Selected Import v1.
2. Verify CI.
3. Merge and let Render redeploy.
4. Test selected LONAB imports in staging with a small batch.
5. Decide the next importer phase: background queue + larger date ranges.

## Documentation Roadmap

Create a formal `docs/` package:

- `PRD.md`
- `ARCHITECTURE.md`
- `SYSTEM_DESIGN.md`
- `DATA_MODEL.md`
- `API.md`
- `PDF_PARSING.md`
- `QA_CHECKLIST.md`
- `DEPLOYMENT.md`
- `LAUNCH_READINESS.md`

## Product Roadmap

### Core App Quality

- Keep the app simple and useful for casual users.
- Add deeper insight paths for serious bettors without making the main screens crowded.
- Avoid direct betting promises or language like "guaranteed", "sure bet", or "must bet".
- Use mostly French UX copy.
- Prefer language such as:
  - "A surveiller"
  - "Profil regulier"
  - "Forme recente positive"
  - "Signal fort"
  - "Signal modere"
  - "Donnees limitees"

### Race Intelligence Layer

Goal: move beyond a nice PDF viewer and become a race intelligence companion.

Phase 1: Horse Intelligence Page

- Last 5 races.
- Win rate and top 3 rate.
- Average finishing position.
- Recent form trend: improving, stable, declining.
- Distance and discipline context.
- Jockey/trainer information.
- Short "A retenir" insight paragraph.

Phase 2: Race Insight Summary

- Quick race summary from structured stats.
- Strongest consensus horse.
- Most consistent horse.
- Horse to watch.
- Risk/context notes without direct betting recommendations.

Phase 3: Pronostics Upgrade

- Expert consensus ranking.
- Agreement/disagreement between prediction sources.
- Source performance after results are uploaded.
- Highlight notable outliers carefully, without direct betting instruction.

Phase 4: Stats Tab Upgrade

- Top horses by win rate.
- Top horses by top 3 rate.
- Best jockeys.
- Best trainers.
- Jockey/trainer combinations.
- Prediction source accuracy.
- Biggest payouts.
- Recurring outsiders.

Phase 5: Premium Analytics Later

- Advanced filters.
- Deeper historical horse stats.
- Watchlist/favorites intelligence.
- Alerts.
- Historical comparisons.
- Serious bettor analytics.

## UI/UX To Do

- Improve perceived loading speed:
  - cache last loaded programme/results locally
  - show cached data immediately on app open
  - refresh data in the background
  - replace full-screen spinners with skeleton/partial loading states where useful
- Improve Results detail UX:
  - "Arrivee officielle"
  - "Rapports principaux"
  - "Couples places"
  - "Autres rapports"
- Keep results flow separate from programme/archive flow.
- Improve Programme vs Resultats context:
  - clearer labels
  - clearer navigation
  - less mental overlap between programme data and official reports
- Add admin post-upload validation summary:
  - horses parsed
  - expected runners
  - predictions found
  - previous results found
  - betting info found
  - warnings/errors list
- Improve admin race list badges:
  - Programme
  - Resultat
  - A des rapports
  - Course active
- Improve empty/error states for Gemini parsing failures and incomplete PDF extraction.

## Backend To Do

- Add app bootstrap endpoint:
  - one request for initial app data
  - include current programme summary/detail
  - include counts/status needed by home screen
  - reduce sequential frontend requests on startup
- Add backend caching/precomputation for expensive data:
  - stats
  - Race Intelligence summaries
  - historical leaderboards
  - prediction source accuracy
- Store parse quality report per upload:
  - horses_count
  - expected_runners
  - has_predictions
  - has_previous_results
  - has_betting_info
  - warnings
- Add result/programme linking:
  - match same date
  - match same race/event
  - match same location when available
  - preserve shared race identity
- Add admin correction endpoints:
  - edit race metadata
  - edit previous results/reports
  - edit betting info
  - later: edit horses and predictions
- Add upload deduplication:
  - file hash
  - filename/date detection
  - prevent duplicate race records from repeated upload
- Add Gemini retry/fallback strategy:
  - retry temporary 503 responses
  - optional fallback model
  - clearer admin-facing parsing errors

## Historical Data Ingestion

The LONAB website has many historical PDF files. We do not need all of them immediately, but more history will make insights stronger.

Recommended phases:

1. Manually upload recent PDFs for staging QA.
2. Batch import last 3 months.
3. Expand to 6 months.
4. Expand to 12 months.
5. Build a LONAB archive importer.
6. Deduplicate files and linked race records.
7. Generate historical horse, jockey, trainer, source, and payout analytics.

Data value milestones:

- 50-100 races: useful early stats.
- 200-500 races: stronger analytics.
- 1000+ PDFs: serious/premium analytics potential.

Prioritize:

- Result PDFs first, because official outcomes power stats.
- Programme/course PDFs too, because they provide horses, jockeys, trainers, predictions, and race context.
- Programme/result linking, because prediction-vs-outcome intelligence depends on it.

## Environment Status

### Local Dev

- Frontend: http://localhost:8081
- Backend: http://localhost:8001
- Purpose: fast build/debug loop.
- Data does not need to match staging.

### Staging

- Web app: https://pmublonab-staging-web.onrender.com
- Admin web: https://pmublonab-staging-admin.onrender.com
- API: https://pmublonab-staging-api.onrender.com
- Purpose: shared review, feedback, production-like testing.
- This is where product review should happen.
- Current performance note:
  - Render may cold start after inactivity.
  - First app open can be slower while the API wakes up.
  - Consider keep-warm monitoring or a paid/always-on instance before broader public testing.

### Production

- Not launched yet.
- Needs final environment variables, MongoDB, admin access model, deployment target, and launch checklist.

## QA Checklist

After each staging deploy:

- Confirm API health.
- Confirm web app loads.
- Confirm admin web loads.
- Upload a programme PDF.
- Verify horse completeness:
  - all horses present
  - numbers match
  - names match
  - jockey/trainer/owner fields captured when present
  - runner count matches PDF
- Verify predictions/classifications.
- Verify previous results/reports:
  - finish order
  - NPO/fallers/disqualified when present
  - payouts and FCFA amounts
  - separate payout rows
- Verify "Arret des jeux".
- Verify Resultats page.
- Verify "Voir tous les rapports".
- Verify mobile layout.
- Verify admin set-current/delete behavior.

## Launch Readiness

- Decide production admin access model.
- Prepare production env vars.
- Create production MongoDB database.
- Configure Gemini key/model for production.
- Configure CORS origins.
- Configure Expo/EAS project ID.
- Test push notifications on a physical Android device.
- Decide backup/export strategy for MongoDB.
- Decide operational owner for deployments and secrets.

## Decisions

- Keep React Native / Expo for now because app-style engagement and push notifications matter.
- Add PWA/lightweight web access later if useful.
- Use staging as the main review environment.
- Keep local dev for fast iteration, not shared review.
- Avoid direct betting recommendations.
- Keep UX mostly French.
- Build insights progressively so the app does not become busy or cumbersome.

## Open Questions

- What production hosting target should be used long term: Render, Railway, Fly, VPS, AWS, or Azure?
- What should the first premium boundary be?
- How much historical data should be ingested before the first public release?
- Should users have accounts, device-bound premium access, or both later?
- What manual admin correction tools are required before launch?
