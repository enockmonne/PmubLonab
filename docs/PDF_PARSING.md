# PDF Parsing

## Current Pipeline

1. Admin uploads a PDF or imports a selected LONAB PDF.
2. Backend reads PDF bytes.
3. Gemini-backed parser extracts structured race data.
4. Temporary Gemini 429/5xx and timeout failures are retried with backoff.
5. Backend normalizes output into the race document shape.
6. Parse quality is computed and returned to admin.

## Supported Document Types

- Programme PDFs with horses, predictions, classifications, betting info, and sometimes previous results.
- Result/rapport PDFs with official finishing order, payouts, and MAP stats.

## Parse Quality Checks

- Horses parsed vs expected runners.
- Predictions found.
- Classifications found.
- Previous results found.
- Betting/Arrêt des jeux found.
- Warning list for missing or inconsistent fields.

## Known Limitations

- Some historical PDFs have different formats.
- Gemini can still fail under sustained high demand after retries are exhausted.
- Programme/result linking is still basic and should be improved.
- Bulk importing should remain capped until duplicate detection and review workflows are trusted.

## Next Improvements

- Optional fallback model.
- Admin correction endpoints.
- Stronger programme/result linking by date, location, and race name.
- Background import queue for larger LONAB batches.

