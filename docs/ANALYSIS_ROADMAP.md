# PMU'B/LONAB/Analysis Roadmap

Last updated: 2026-08-29

## Roadmap Principles

- Keep the original PMU'B/LONAB app stable.
- Build analysis as a separate product boundary first, then deepen features.
- Prefer small, verifiable slices.
- Use historical data quality as the gate for advanced analysis.
- Avoid direct betting recommendations at every phase.

## Phase 1: Product Boundary And Docs

Status: complete.

Goals:

- Create analysis-specific product docs.
- Add analysis env examples.
- Add product flags for backend, frontend, and admin.
- Add admin product selection after login.
- Add analysis admin route group.
- Add first analysis frontend tab labels.

Done:

- `docs/PMUB_LONAB_ANALYSIS_PLAN.md`
- `docs/ANALYSIS_IMPLEMENTATION_KICKOFF.md`
- `backend/.env.analysis.example`
- `frontend/.env.analysis.example`
- `admin-web/.env.analysis.example`
- Admin product selector.
- Analysis admin dashboard.
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

Status: in progress.

Goal: make `Chevaux` the first deep research workflow.

Build:

- Done: horse search/list and historical leaderboard.
- Done: linked-result win/top-3 rates with coverage context.
- Horse profile by name and deeper drilldown.
- Last appearances and filters.
- Win/top-3 rate when linked official results exist.
- Performance by distance/type/discipline when data exists.
- Jockey/trainer context.
- Limited-data explanation.

Backend:

- Horse profile endpoint.
- Aggregates from linked official result records.
- Normalized horse names and aliases.

## Phase 4: Historical Race Explorer

Status: next.

Goal: make `Courses` useful for comparing historical race contexts.

Build:

- Historical race list with filters.
- Filters for date, location, race type, discipline, and doc type.
- Programme/result linkage indicators.
- Similar race lookup prototype.
- Race detail with PDF-derived provenance.

Backend:

- Filterable race endpoint improvements.
- Similarity fields and scoring.
- Better metadata correction support if parsed fields are inconsistent.

Implementation control document:

- `docs/ANALYSIS_COURSES_IMPLEMENTATION_PLAN.md`

## Phase 5: Source And Media Performance

Status: in progress.

Goal: make `Sources` show evidence-backed pronostic performance.

Build:

- Done: initial source leaderboard with evaluated-race counts and methodology.
- Source detail pages.
- Evaluation counts.
- Top pick win/top-3 metrics.
- Base/top selection behavior.
- Alias normalization visibility.
- Exclusion notes when official results are missing.

Backend:

- Improve source normalization.
- Expand source performance endpoint.
- Add source detail drilldown.

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
- Programme/result linking review.

Milestones:

- Done: one matching programme/result pair parsed and automatically linked.
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

1. Build the purpose-built `Courses` screen from the focused implementation plan.
2. Validate it against the linked August 26, 2026 programme/result pair.
3. Add deeper horse and source drilldowns after the race explorer is stable.
4. Import a small multi-date dataset before attempting bulk historical ingestion.
5. Provision the separate Analysis Render staging services and Atlas database.
