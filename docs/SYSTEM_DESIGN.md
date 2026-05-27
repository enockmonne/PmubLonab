# System Design

## Design Principles

- Mobile-first, web-compatible.
- Simple by default, deeper on demand.
- Staging is the main shared review environment.
- Local dev is for fast iteration and may use different data.
- Avoid direct betting guarantees.
- Preserve official source data while adding useful structure and insights.

## Main Workflows

### Programme Upload

1. Admin uploads a PDF.
2. Backend extracts text with `pdfplumber`.
3. Backend sends a strict extraction prompt to Gemini.
4. Gemini returns structured JSON.
5. Backend normalizes the race document.
6. Backend stores it in MongoDB.
7. App/API consumers display it.

### Programme Viewing

1. App requests programme summaries.
2. App selects current/default programme.
3. App requests full race detail.
4. App displays programme, summary stats, top picks, and betting/footer info.
5. Cached data appears first on repeat opens.

### Results Viewing

1. App requests races with result data using `has_results=true`.
2. Backend returns both result-only PDFs and programme PDFs that contain previous results.
3. App displays result cards.
4. "Voir tous les rapports" opens a result-focused race detail view.

### Admin Current Race

1. Admin selects a race.
2. Backend clears all `is_current` flags.
3. Backend marks the selected race current.
4. Backend triggers race-update push notification task.

## Error Handling

Current:

- Backend returns parse errors as admin-facing upload errors.
- Gemini 503 is surfaced as parsing failure.
- Frontend logs fetch failures and shows loading/empty states.

Needed:

- Retry Gemini transient failures.
- Better parse quality warnings.
- More helpful admin upload feedback.
- Correction tools for bad extraction.

## Performance Strategy

Current:

- Frontend caches selected Programmes and Resultats data.
- Repeat opens can hydrate from cache before network refresh.

Next:

- Add `/api/app/bootstrap` to reduce startup requests.
- Precompute expensive stats and intelligence.
- Consider always-on staging/prod API for broader testing.

## Security Notes

- Production requires explicit `JWT_SECRET`.
- Admin passcode fallback has been removed.
- Admin auth uses JWT and password hashing.
- CORS is environment-configurable.
- Secrets must stay in environment variables, not source control.
