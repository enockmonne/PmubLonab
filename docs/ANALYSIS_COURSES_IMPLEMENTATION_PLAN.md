# PMU'B/LONAB/Analysis Courses Implementation Plan

Last updated: 2026-08-29

## Objective

Replace the reused `Courses` tab with a French-first historical race explorer.
The screen should help users find, inspect, and understand stored race records
without presenting betting recommendations.

## Validated Starting Point

- `Recherche`, `Chevaux`, and `Sources` already use Analysis-specific screens.
- The existing API exposes stored races and document metadata.
- Programme/result linking is implemented and was validated with the August 26,
  2026 Prix Latitude GPS programme and official result.
- The validated pair demonstrates that programme and result titles may differ
  while still representing the same event.
- The local dataset remains intentionally small, so every state must explain
  limited coverage.

## User Questions

- Which historical races are available?
- Does a race have a programme, an official result, or both?
- What were the race profile, runners, official arrival, and payouts?
- Which facts came from which PDF-derived record?
- How complete and trustworthy is the available data?

## Initial Scope

### Race List

- List historical race groups newest first.
- Group linked programme and result documents into one visible race entry.
- Show date, location, race name, discipline/type, distance, and runner count
  when available.
- Show explicit badges for `Programme`, `Résultat`, and `Liés`.
- Preserve separate document identities and provenance inside the detail view.

### Filters

- Text search by race name or location.
- Date range.
- Location/hippodrome.
- Discipline or race type.
- Document coverage: all, programme only, result only, linked pair.
- Clear-all action and visible result count.

### Race Detail

- Programme metadata and runners.
- Official finishing order and non-partants when a result is linked.
- Payout/rapport summary when available.
- Linked document names and IDs.
- Parse-quality coverage and warnings.
- Clear source labels distinguishing programme-derived and result-derived facts.

### Empty And Limited-Data States

- No historical documents imported.
- No result for the selected programme.
- Result without a matched programme.
- No records match the active filters.
- Parsed record has missing or low-coverage fields.

All states must remain useful and must not imply that missing data is evidence
about likely race outcomes.

## Data And API Approach

Start by reusing the existing race endpoints and linked-document summaries.
Avoid new backend work until the frontend data contract is mapped and a specific
gap is demonstrated.

### Pre-Coding Contract Review

The read-only contract review completed on 2026-08-29 confirmed:

- The `Courses` tab still renders the original `programmes.tsx` experience and
  does not yet branch on `IS_ANALYSIS_APP`.
- `GET /api/races` already supplies document identity, basic race metadata,
  programme/result linkage, arrival previews, and a top payout.
- `GET /api/races/{race_id}` supplies the full programme or result document,
  including runners, official-result fields, payouts, `npo`, and parse quality.
- A linked programme/result pair can be grouped from the existing linked IDs,
  while preserving both source documents.

The review also demonstrated these minimal API gaps:

- Add `discipline`, `distance_m`, and `parse_quality` to each list summary.
- Add optional date-range and discipline/race-type list filters.
- Add an optional linkage-state filter for linked, programme-only, and
  result-only discovery.

These changes must remain backward compatible. Linked detail documents can be
loaded through the existing detail endpoint using the linked IDs, so a new
combined-detail endpoint is not required for the first slice.

Required list fields:

- `race_id`
- `doc_type`
- `name`
- `date_iso` and `date_text`
- `location`
- `race_type` or `discipline`
- `distance_m`
- `runners`
- linked programme/result IDs and summaries
- official arrival/payout summary when available
- parse-quality warnings or coverage indicators

If the current list endpoint cannot return these fields efficiently, extend it
with the smallest backward-compatible response change. Do not create a separate
analytics service for this first slice.

## UX And Design Constraints

- Reuse the existing Analysis typography, colors, cards, spacing, and tab shell.
- Keep labels and explanations French-first.
- Optimize for mobile and web.
- Prefer scan-friendly metadata and badges over dense tables on small screens.
- Avoid certainty language and direct betting recommendations.
- Show sample size, linkage state, and missing-data caveats prominently.

## Implementation Slices

1. Add the verified backward-compatible list fields and filters, with API tests.
2. Add an `IS_ANALYSIS_APP` branch and a dedicated `AnalysisCoursesScreen` while
   preserving the original product's `programmes.tsx` behavior.
3. Build the Analysis race list with grouped linkage and limited-data states.
4. Add search and coverage filters.
5. Add race detail with official arrival, payouts, `npo`, and provenance by
   loading linked documents through the existing detail endpoint.
6. Validate mobile/web rendering against the representative linked pair and an
   unmatched sample record.

## Acceptance Criteria

- Analysis mode renders a purpose-built `Courses` screen.
- The August 26 linked programme/result pair appears as one understandable race
  context while retaining both source documents.
- Arrival `6-10-1-4-13` and non-partant `11` are shown as official-result data.
- Users can filter by text and document coverage.
- Linked, programme-only, and result-only states are visually distinct.
- PDF-derived provenance and parse warnings are visible.
- Empty and limited-data states are in French and do not suggest bets.
- Existing original-product behavior is unchanged.
- Frontend typecheck/lint, admin build, backend compile, Compose validation, and
  relevant tests pass.

## Non-Goals For This Slice

- Similar-race scoring or recommendation ranking.
- AI-generated race advice.
- Saved searches or user personalization.
- Bulk historical ingestion.
- Manual metadata correction UI.
- New premium-access enforcement.

## Review Gate Before Coding

Completed on 2026-08-29. The route and API findings are recorded above. Coding
may begin with the minimal backward-compatible list contract extension; no new
service or combined-detail endpoint is justified for this slice.
