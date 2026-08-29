# PMU'B/LONAB/Analysis PRD

Last updated: 2026-08-29

## Current Validated State

The laptop migration and local Analysis environment are complete. The validated
baseline now includes:

- Isolated local frontend, API, MongoDB, containers, and database.
- Portable Windows and macOS/Linux development launchers and checkers.
- Working Analysis admin login, product selection, and upload workflow.
- Purpose-built `Recherche`, `Chevaux`, and `Sources` screens.
- A representative programme/result pair imported, parsed, automatically linked,
  and reflected in horse and source statistics.
- Draft PR #88 with passing backend, frontend, and admin CI checks.

The next product-development slice is the purpose-built historical `Courses`
screen. Its implementation plan is documented in
`docs/ANALYSIS_COURSES_IMPLEMENTATION_PLAN.md`.

## Product Summary

PMU'B/LONAB/Analysis is a French-first research and intelligence application for bettors who want deeper historical context from official PMU'B/LONAB PDF data.

The product turns programme PDFs, result/report PDFs, and historical archives into searchable, comparable, and explainable information. It must help users understand context without presenting direct betting instructions or guaranteed outcomes.

## Target Users

- Serious bettors who want historical horse, jockey, trainer, source, and race context before making their own decisions.
- Existing PMU'B/LONAB users who have outgrown simple programme/results viewing.
- Admin users who upload PDFs, import LONAB archives, monitor extraction quality, and prepare structured data for analysis.

## Core User Questions

- What has this horse done historically?
- How has this horse performed by distance, race type, discipline, or track/location?
- Which jockeys and trainers appear consistently in strong historical results?
- Which media/pronostic sources have historically performed better?
- How do odds, media selections, and actual results compare over time?
- What similar historical races exist for this race profile?
- What context should I know before reading the raw programme?

## Value Proposition

- Search across historical PMU'B/LONAB data instead of reading PDFs one by one.
- Build horse, source, jockey, trainer, and race context from stored structured data.
- Show data coverage and limitations clearly so users know when evidence is thin.
- Make official results and programme data useful for research without promising betting outcomes.
- Preserve PDF provenance so summaries and insights remain grounded in source data.

## Non-Goals

- Do not provide direct betting recommendations.
- Do not use language such as "bet this", "sure bet", "guaranteed", or "must play".
- Do not mix analysis data into the original app's production/staging database.
- Do not bulk-ingest all historical PDFs until dedupe, parse quality, and review workflows are reliable.
- Do not make generated AI summaries appear more authoritative than the underlying data coverage supports.

## Product Principles

- French-first UX.
- Research over recommendation.
- Explainable before clever.
- Show limited-data states instead of hiding uncertainty.
- Reuse the current PmubLonab design system first, then diverge only where analysis workflows need it.
- Keep raw PDF-derived facts traceable to stored records.

## Initial User Experience

The first analysis frontend should gradually reshape the existing app into these tabs:

- `Recherche`: search and research landing.
- `Chevaux`: horse profiles and historical form.
- `Courses`: historical race explorer and race profile comparisons.
- `Sources`: media/pronostic source performance.
- `Analyses`: summaries, leaderboards, and statistical context.

Early releases may reuse existing screens while purpose-built analysis screens are introduced one by one.

## Admin Experience

Admin users share the existing login foundation, then select a product area:

- `PMU'B/LONAB`
- `PMU'B/LONAB/Analysis`

Analysis admin must support:

- Uploading programme and result PDFs.
- Importing LONAB archive PDFs.
- Seeing parsed/skipped/error import results.
- Reviewing duplicate detection.
- Seeing extraction quality and missing fields.
- Rebuilding or reviewing programme/result links.
- Preparing historical data for search and analytics.

## Data Requirements

Primary sources:

- Programme PDFs.
- Result/report PDFs.
- Historical PDF archives from LONAB.

Initial structured data:

- Race metadata.
- Horses.
- Jockeys.
- Trainers.
- Owners.
- Predictions/pronostics.
- Odds.
- Weekly best/classification sections.
- Official arrivals/results.
- Payouts/rapports.
- Linked programme/result relationships.
- Import metadata and parse quality signals.

Future indexes:

- Horse name.
- Jockey.
- Trainer.
- Owner.
- Date.
- Location/hippodrome.
- Discipline.
- Race type.
- Distance.
- Media/source name.
- Similar race profile fields.

## Success Criteria

- Users can search historical data by horse, race, jockey, trainer, or source.
- Horse profiles show useful historical context with clear coverage limits.
- Source/media performance is evaluated only against linked official result documents.
- Admin can import historical PDFs without silently creating duplicate or low-confidence records.
- Analysis service uses a separate database and environment from the original app.
- UI copy avoids direct betting advice while still providing useful context.

## Monetization Direction

The analysis product is likely a premium or higher-value tier later. Initial packaging can remain undecided while core research workflows are validated.

Possible future packages:

- Controlled beta access.
- Weekly/monthly analysis access.
- Premium analytics tier for deeper historical filters and AI-assisted summaries.

Backend-owned entitlements should eventually enforce paid access; frontend-only gating is not sufficient.

## Open Questions

- Should analysis be premium-only from the beginning?
- Should the first release be web/PWA only or include native Expo targets?
- Which historical date range should be imported first?
- Should original PDF files be retained long-term or only structured data and metadata?
- How much AI-assisted summarization should ship before deterministic analytics are mature?
- Should fuzzy matching handle accents, spelling variants, and horse-name aliases in the first release?
