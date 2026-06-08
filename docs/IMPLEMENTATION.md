# Implementation Plan

Last updated: 2026-06-03

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
- Admin upload validation now also surfaces odds tables and weekly-best extraction.
- Horse detail pages now include a compact Horse Intelligence panel.
- Programmes now include a Race Insight Summary built from structured consensus and form signals.
- Pronostics now include media agreement, base spread, and outlier context.
- Stats tab UI now surfaces summary metrics, a top signal card, and linked-result coverage context.
- Resultats cards now make official arrivals and the main payout easier to scan.
- Admin now has a LONAB archive preview screen for discovering PDF links before bulk import.
- LONAB archive imports can now download selected PDFs, hash them for deduplication, parse them, and report per-file results.
- LONAB import source selection supports Programmes, Resultats/Gains, and guarded custom LONAB URLs.
- Gemini parsing now retries transient 503/timeouts; a 5-PDF retry batch was validated successfully in staging.
- Duplicate detection for imported PDFs was validated by re-importing the same PDF and confirming it is skipped.
- Recent LONAB imports are visible in admin after import.
- Programme and result documents are linked after upload/import when a likely same-date counterpart exists.
- Stats endpoints use linked official result documents to evaluate pronostics, horses, jockeys, and trainers.
- Stats now prefers linked official result PDFs for programme analytics, falling back to embedded programme results only when no linked result exists.
- Admin Courses can rebuild programme/result links and show the linked target programme/result names.
- Formal project docs package exists under `docs/`.
- Custom Codex workflow skills exist for repeated project work:
  - `pmublonab-staging-qa`
  - `pmublonab-pr-check`
  - `pmublonab-handoff`

## Active PRs

- No current mainline implementation PR is expected at this checkpoint.
- Older open PRs still visible on GitHub and likely stale/superseded:
  - PR #9 `Add project documentation package`
  - PR #14 `Add Stats tab horse leaderboards`

## Immediate Next Steps

1. Continue small-batch LONAB ingestion in staging, importing both programme PDFs and result/gain PDFs.
2. Normalize duplicate pronostic/source names so variants such as casing, accents, and apostrophes roll up cleanly in Stats.
3. Improve Results detail UX so official arrivals and payout groups are easier to scan.
4. Improve Admin import UX with filters for imported/skipped/error files and a retry action for failed PDFs.
5. Add admin manual correction tools for programme/result links and extracted race metadata.
6. Continue Race Intelligence/Stats value work: horse leaderboards, source accuracy explanations, and clearer limited-data states.
7. Run a focused UI consistency and polish pass across the main app screens.
8. Keep updating docs and handoff notes before switching computers or opening a long new implementation thread.

## Documentation Roadmap

Formal `docs/` package:

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

- Run a focused UI consistency and polish pass, not a full redesign:
  - standardize card spacing, section headings, badges, actions, and empty states
  - make hierarchy clearer on Programme, Partants, Pronos, Resultats, Archives, and Stats
  - keep raw-data tabs calm and direct
  - make Stats feel like the premium/value-added insight area
  - reduce visual clutter and unnecessary taps without making screens too dense
  - review mobile-first scanning: race name, date, runners, official arrival, gains, and primary action should be easy to find
  - align button/action styling, especially secondary links versus important actions such as "Voir tous les rapports"
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
- Continue polishing admin post-upload/import validation summary:
  - horses parsed
  - expected runners
  - predictions found
  - odds tables found
  - weekly best trainers/drivers found
  - previous results found
  - betting info found
  - warnings/errors list
- Improve admin race list badges:
  - Programme
  - Resultat
  - A des rapports
  - Course active
- Improve empty/error states for Gemini parsing failures and incomplete PDF extraction.
- Improve Stats explainability:
  - show which linked result documents are being used
  - explain why a race/source is excluded from a metric
  - normalize duplicate source labels before ranking

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
- Improve result/programme linking:
  - review linked records in admin
  - add manual correction/override tools
  - expand prediction-vs-outcome analytics and show per-race explainability
- Add admin correction endpoints:
  - edit race metadata
  - edit previous results/reports
  - edit betting info
  - later: edit horses and predictions
- Add upload deduplication:
  - file hash
  - filename/date detection
  - prevent duplicate race records from repeated upload
- Continue PDF parser resilience improvements:
  - retry temporary 503 responses
  - add provider fallback chain: Gemini primary -> Mistral OCR/OpenAI/Claude fallback
  - separate deterministic/OCR extraction from LLM normalization where practical
  - clearer admin-facing parsing errors
  - preserve provider, quota, and retry details in admin parse feedback

### Robustness Improvement Plan

Goal: make extraction more reliable for mechanical PDF tables and reduce dependence on Gemini for data that should be read deterministically.

- Add deterministic extraction for Paris Turf / Tierce Magazine odds tables:
  - identify source rows directly from PDF text/tables
  - pair horse numbers with fraction odds such as `7/1`, `57/1`, `99/1`
  - validate that extracted horse numbers exist in the programme
  - store empty odds only when the PDF truly has no odds table
- Keep Gemini/LLM parsing focused on harder interpretive sections:
  - race metadata
  - horse commentary and history
  - pronostics and classifications
  - narrative summaries
- Add parser confidence and diagnostics:
  - source found/not found
  - number of odds values extracted
  - mismatch warnings when table columns do not match runners
  - admin-facing notes when fallback extraction was used
- Add regression tests with representative PDF text/table fixtures:
  - programme with Paris Turf and Tierce Magazine odds
  - programme without odds
  - malformed or partial odds table
- Reparse or backfill affected staging records only after deterministic extraction is validated.

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
- Verify Admin > Courses > `Lier` can rebuild programme/result links.
- Verify linked programme/result target names are visible in admin.
- Verify Stats linked-result count is greater than 0 when linked result documents exist.
- Verify Stats uses linked official result PDFs before falling back to embedded programme results.
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
- Use custom PmubLonab Codex skills for repeated workflows:
  - staging QA after Render deploys
  - PR/CI status checks
  - project handoff before switching computers or long context changes

## Open Questions

- What production hosting target should be used long term: Render, Railway, Fly, VPS, AWS, or Azure?
- What should the first premium boundary be?
- How much historical data should be ingested before the first public release?
- Should users have accounts, device-bound premium access, or both later?
- What manual admin correction tools are required before launch?
