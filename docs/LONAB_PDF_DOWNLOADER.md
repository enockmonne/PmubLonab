# LONAB PDF Downloader

`scripts/download_lonab_pdfs.py` creates a small local archive of the public
PMU'B programme and result PDFs published on the official LONAB website. It
downloads files only; it does not parse or import them into MongoDB.

## Safety defaults

- Checks LONAB `robots.txt` before discovery and before every PDF download.
- Accepts only HTTPS URLs on `lonab.bf` or `www.lonab.bf`.
- Defaults to a five-file dry run.
- Hard-limits a run to ten PDFs while the workflow is being validated.
- Waits at least three seconds, plus jitter, between requests.
- Retries only temporary network and `5xx` failures.
- Stops immediately on `403` or `429`; it does not attempt to evade a block.
- Verifies the `%PDF-` file signature and enforces a 25 MB per-file limit.
- Uses SHA-256 and a resumable manifest to avoid downloading the same URL twice.
- Writes temporary `.part` files and renames them only after validation.

Downloaded PDFs and the local manifest live under `downloads/lonab/`, which is
ignored by Git. Do not commit the PDF archive.

## Start with a dry run

From the repository root:

```bash
python3 scripts/download_lonab_pdfs.py --kind both --limit 5
```

The `both` mode alternates programmes and results, so a small batch contains
both document types when both are available.

## Select a date or date range

Select one publication date:

```bash
python3 scripts/download_lonab_pdfs.py --kind both --date 2026-09-27 --limit 10
```

Select an inclusive date range:

```bash
python3 scripts/download_lonab_pdfs.py \
  --kind both \
  --from-date 2026-09-20 \
  --to-date 2026-09-27 \
  --limit 10
```

Add `--download` only after reviewing the preview. Date filtering happens
before the batch limit. The script searches the listing pages requested with
`--pages`; increase that value, up to five, when selecting older dates.

## Download the first batch

```bash
python3 scripts/download_lonab_pdfs.py --kind both --limit 5 --download
```

After reviewing the five files and server responses, a second validation batch
can use ten files:

```bash
python3 scripts/download_lonab_pdfs.py --kind both --limit 10 --download
```

Other useful options:

```bash
python3 scripts/download_lonab_pdfs.py --kind programmes --limit 5 --download
python3 scripts/download_lonab_pdfs.py --kind results --limit 5 --pages 2 --download
python3 scripts/download_lonab_pdfs.py --help
```

Do not reduce the delay to create high request volume. If LONAB returns `403`
or `429`, stop and wait for the site operator's published retry period or obtain
permission before continuing.

## Importing downloaded files

The existing Analysis admin supports direct LONAB import and manual PDF upload.
Use the local downloader when an inspectable archive is useful; use the admin
importer when the goal is to parse selected public PDFs directly into the
Analysis database. Keep imports to small reviewed batches until parse-quality
and programme/result linking checks pass.
