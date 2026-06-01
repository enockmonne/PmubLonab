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

- Preview LONAB archive returns PDF links.
- Selected import rejects non-LONAB URLs.
- Selected import caps requests at 5 PDFs.
- Duplicate PDF import is skipped by hash.
- Imported document appears in admin race list.
- Parse quality is visible after import.

## Content QA

- French copy is understandable.
- Insight copy avoids direct betting recommendation.
- Limited-data states are clear.
- Arrêt des jeux displays consistently.

