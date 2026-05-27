# PDF Parsing

## Current Pipeline

1. Admin uploads a PDF.
2. Backend reads PDF bytes.
3. `pdfplumber` extracts raw text.
4. Backend truncates very long text to stay inside model limits.
5. Backend sends raw text plus extraction prompt to Gemini.
6. Gemini returns strict JSON.
7. Backend strips markdown fences if needed.
8. Backend parses JSON and normalizes it into a race document.
9. Race document is inserted into MongoDB.

## Supported PDF Types

### Programme / Course PDF

Expected to contain:

- race metadata
- horses/partants
- predictions
- classifications
- betting footer
- sometimes previous results/reports

Stored as `doc_type=programme`.

### Result PDF

Expected to contain:

- official finishing order
- NPO/fallers/disqualified if present
- payouts/reports

Stored as `doc_type=result` when no horses are present and finishing order exists.

## Gemini Role

Gemini converts messy PDF text into structured JSON. It is not used when users simply open the app. It is only used during PDF upload/parsing.

## pdfplumber Role

`pdfplumber` extracts text from PDFs before Gemini sees the content. It does not understand the race itself; it only provides text extraction.

## Known Risks

- PDF layouts may change.
- Gemini can return temporary 503 high-demand errors.
- Some PDFs may have poor text extraction.
- Historical PDFs may use inconsistent formatting.
- Results embedded in course PDFs must be extracted reliably.

## Needed Improvements

- Retry Gemini on transient 503 failures.
- Add fallback model option.
- Store parser version and model used.
- Store parse quality report.
- Add admin correction screens.
- Add deduplication by file hash.
- Add result/programme linking.
- Add batch archive importer for historical LONAB PDFs.
