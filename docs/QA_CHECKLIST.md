# QA Checklist

## Before Merge

- Backend syntax/checks pass.
- Backend API tests pass in CI.
- Frontend lint and TypeScript pass.
- Admin production build passes.
- PR scope is focused and documented.

## Staging Smoke Test

- API health and `/api/races` work.
- Web app loads Programmes, Pronostics, Resultats, Stats.
- Admin login works.
- PDF upload shows parse validation.
- Set-current updates the visible programme.
- Result detail does not route users unexpectedly to archive context.

## Import QA

- Preview LONAB Programmes source returns PDF links.
- Preview LONAB Resultats/Gains source returns PDF links.
- Custom source accepts only LONAB URLs.
- Selected import rejects non-LONAB URLs.
- Selected import caps requests at 5 PDFs.
- Duplicate PDF import is skipped by hash.
- Imported document appears in admin race list.
- Parse quality is visible after import.

## LONAB Staging Import Procedure

Use this procedure before importing larger batches.

1. Open staging admin and go to Import LONAB.
2. Select `Programmes PMU'B`, then preview with 1 page and limit 25.
3. Select exactly 1 PDF.
4. Import the PDF and wait for the per-file result.
5. Confirm the result is `imported` or a clear `error`.
6. If imported, open Courses and confirm the new document exists.
7. Open the public app and confirm the imported programme/result behaves as expected.
8. Confirm the document appears in the recent LONAB imports list.
9. Re-import the same PDF and confirm it is skipped as a duplicate.
10. Only after this passes, try a 3-5 PDF batch.
11. Repeat the preview check with `Resultats / Gains PMU'B`.
12. Record any parser warnings or format issues for follow-up.

## Content QA

- French copy is understandable.
- Insight copy avoids direct betting recommendation.
- Limited-data states are clear.
- Arrêt des jeux displays consistently.

