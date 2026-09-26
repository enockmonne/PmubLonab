# PMU'B/LONAB/Analysis Roadmap

Last updated: 2026-09-26

## Roadmap Principles

- Keep the original PMU'B/LONAB production data and deployment stable.
- Use one Analysis experience on staging with an explicit environment and database boundary.
- Prefer small, verifiable slices.
- Use historical data quality as the gate for advanced analysis.
- Avoid direct betting recommendations at every phase.

## Phase 1: Product Boundary And Docs

Status: complete.

Goals:

- Create analysis-specific product docs.
- Add analysis env examples.
- Add product flags for backend, frontend, and admin.
- Initially add admin product selection and an Analysis route group, then consolidate them into one admin.
- Add first analysis frontend tab labels.

Done:

- `docs/PMUB_LONAB_ANALYSIS_PLAN.md`
- `docs/ANALYSIS_IMPLEMENTATION_KICKOFF.md`
- `backend/.env.analysis.example`
- `frontend/.env.analysis.example`
- `admin-web/.env.analysis.example`
- Done, then superseded: Admin product selector and duplicate Analysis route group.
- Unified, feature-complete Analysis admin dashboard with legacy route redirects.
- Analysis frontend product flag and tab labels.
- Admin status environment diagnostics.

Validated after laptop migration:

- Portable Windows and macOS/Linux local tooling.
- Isolated Analysis credentials, containers, ports, and database.
- Draft PR #88 remains open with passing CI.

## Phase 2: Research Landing And Search

Status: complete for the initial research landing.

Goal: make the first tab feel like a research tool, not just an archive list.

Build:

- Done: `Recherche` landing screen.
- Done: search input focused on horse, race, jockey, trainer, and source queries.
- Done: recent races and document counts.
- Done: quick links to:
  - horse profile
  - race explorer
  - source performance
  - historical archives
- Clear empty and limited-data states.

Backend:

- Review existing `/api/search` response shape.
- Add missing fields needed by the research landing.
- Add normalized keys/indexes if search quality is weak.

Verification:

- Search works on mobile and web.
- Results distinguish horses, races, jockeys, trainers, and sources.
- No direct betting advice copy appears.

## Phase 3: Horse Intelligence

Status: complete for the initial searchable horse profile.

Goal: make `Chevaux` the first deep research workflow.

Build:

- Done: horse search/list and historical leaderboard.
- Done: linked-result win/top-3 rates with coverage context.
- Done: horse profile by normalized name with a historical appearance drilldown.
- Done: appearance filters by result coverage and discipline.
- Done: win/top-3 rates when linked official results exist.
- Done: race context including distance, type/discipline, and location when available.
- Done: observed jockey and trainer context.
- Done: explicit coverage and limited-data explanation.

Backend:

- Done: horse profile endpoint.
- Done: aggregates from linked official result records without hiding programme-only appearances.
- Normalized horse names and aliases.

## Phase 4: Historical Race Explorer

Status: complete for the initial historical explorer.

Goal: make `Courses` useful for comparing historical race contexts.

Build:

- Done: searchable historical race list.
- Done: linked, programme-only, and result-only coverage filters.
- Done: programme/result grouping with preserved document provenance.
- Done: official arrival, non-partants, payouts, runners, and parse warnings.
- Done: responsive Analysis-only list and dossier views.
- API-ready: date, race-type/discipline, and location filtering for future UI expansion.
- Later: similar-race lookup after the historical corpus is large enough.

Backend:

- Done: backward-compatible filterable race endpoint improvements.
- Similarity fields and scoring.
- Better metadata correction support if parsed fields are inconsistent.

Implementation control document:

- `docs/ANALYSIS_COURSES_IMPLEMENTATION_PLAN.md`

## Phase 5: Source And Media Performance

Status: complete for the initial source drilldown.

Goal: make `Sources` show evidence-backed pronostic performance.

Build:

- Done: initial source leaderboard with evaluated-race counts and methodology.
- Done: source detail pages with a race-by-race audit trail.
- Done: appearances, evaluated-race counts, and coverage percentage.
- Done: top-pick win/top-3 metrics.
- Done: base/top-selection behavior and official-arrival comparison.
- Done: alias normalization visibility.
- Done: explicit exclusions when official results or selections are missing.

Backend:

- Done: improved source normalization and alias handling.
- Done: source leaderboard restricted to linked official result documents.
- Done: expanded source performance calculations and methodology metadata.
- Done: source detail drilldown endpoint.

## Phase 6: Historical Ingest And Data Quality

Status: in progress at representative-dataset validation.

Goal: safely expand the analysis database.

Build:

- Bulk import workflow for historical LONAB PDFs.
- Import result filters:
  - imported
  - skipped
  - duplicate
  - error
- Retry failed imports.
- Parse quality screen.
- Missing-field review.
- Done: programme/result linking review and manual correction in the Analysis admin.

Milestones:

- Done: one matching programme/result pair parsed and automatically linked.
- Done: manual programme/result links and exclusions survive automatic link rebuilds.
- Recent 3 months.
- Recent 6 months.
- Recent 12 months.
- Multi-year historical archive.

Prioritize:

- Result PDFs first for official outcomes.
- Programme PDFs second for horses, sources, and race context.
- Linking quality before advanced performance metrics.

## Phase 7: Analysis Summaries

Goal: make `Analyses` a concise research dashboard.

Build:

- Data coverage summary.
- Horse leaderboards.
- Jockey/trainer leaderboards.
- Source performance summaries.
- Odds vs result context where data exists.
- Similar race insights.

Rules:

- Cite or derive from stored structured data.
- Show sample size.
- Warn when linked result coverage is low.
- Avoid direct betting instructions.

## Phase 8: AI-Assisted Research Notes

Goal: add summaries only after deterministic data is reliable.

Build:

- PDF-grounded race summaries.
- Horse research notes.
- Source divergence explanations.
- "What changed since last appearance" notes.

Requirements:

- Summaries must be grounded in stored PDF-derived data.
- Include data coverage and caveats.
- Do not produce direct recommendations.
- Store generated summary metadata and model/provider info.

## Phase 9: Premium Access And Launch

Goal: prepare analysis as a paid or controlled-access product.

Build:

- Entitlement model.
- Admin grant/revoke/extend access.
- Payment provider selection for Burkina Faso.
- French payment/access states.
- Production-like always-on API.
- Monitoring and backups.

Possible packaging:

- Controlled beta.
- Weekly analysis access.
- Monthly analysis access.
- Premium analytics tier.

## Near-Term Next Steps

1. Import a small multi-date programme/result dataset before attempting bulk historical ingestion.
2. Review automatic links and correct mismatches from the Analysis admin.
3. Add parse-quality review and retry tools for failed or incomplete imports.
4. Expand to recent 3-, 6-, and 12-month historical coverage in measured stages.
5. Validate the research workflows with a small bettor pilot before launch packaging.
