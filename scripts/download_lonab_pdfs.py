#!/usr/bin/env python3
"""Download small, respectful batches of public PMU'B PDFs from LONAB.

The downloader intentionally favors low request volume over speed. It checks
robots.txt, identifies itself, spaces requests, records completed downloads,
and stops immediately if LONAB responds with a block or rate-limit status.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random
import re
import sys
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable, Sequence
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qsl, urlencode, urljoin, urlparse, urlunparse
from urllib.request import Request, build_opener
from urllib.robotparser import RobotFileParser


BASE_URL = "https://lonab.bf"
ROBOTS_URL = f"{BASE_URL}/robots.txt"
SOURCE_URLS = {
    "programmes": f"{BASE_URL}/fr/programme-pmub?page=0",
    "results": f"{BASE_URL}/fr/resultats-gains-pmub?page=0",
}
USER_AGENT = "PMUBLONABAnalysis/0.1 (+https://github.com/enockmonne/PmubLonab)"
DEFAULT_OUTPUT = Path("downloads/lonab")
DEFAULT_LIMIT = 5
DEFAULT_DELAY_SECONDS = 3.0
MAX_SAFE_BATCH = 10
MAX_PAGES = 5
MAX_PDF_BYTES = 25 * 1024 * 1024
TRANSIENT_STATUSES = {500, 502, 503, 504}
STOP_STATUSES = {403, 429}


class DownloaderError(RuntimeError):
    """A safe, user-facing downloader failure."""


@dataclass(frozen=True)
class PdfCandidate:
    kind: str
    url: str
    filename: str
    title: str = ""


@dataclass(frozen=True)
class DownloadRecord:
    kind: str
    url: str
    filename: str
    sha256: str
    size_bytes: int
    downloaded_at: str


class LinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[tuple[str, str]] = []
        self._href: str | None = None
        self._text: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "a":
            return
        href = dict(attrs).get("href")
        if href:
            self._href = href
            self._text = []

    def handle_data(self, data: str) -> None:
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "a" and self._href is not None:
            title = re.sub(r"\s+", " ", " ".join(self._text)).strip()
            self.links.append((self._href, title))
            self._href = None
            self._text = []


class PoliteClient:
    def __init__(self, delay_seconds: float, jitter_seconds: float = 1.0) -> None:
        self.delay_seconds = max(delay_seconds, 1.0)
        self.jitter_seconds = max(jitter_seconds, 0.0)
        self.opener = build_opener()
        self.last_request_at = 0.0

    def _wait(self) -> None:
        elapsed = time.monotonic() - self.last_request_at
        target = self.delay_seconds + random.uniform(0, self.jitter_seconds)
        if elapsed < target:
            time.sleep(target - elapsed)

    def get(self, url: str, retries: int = 2) -> tuple[bytes, str]:
        ensure_lonab_url(url)
        for attempt in range(retries + 1):
            self._wait()
            request = Request(
                url,
                headers={
                    "User-Agent": USER_AGENT,
                    "Accept": "application/pdf,text/html;q=0.9,*/*;q=0.5",
                },
            )
            try:
                with self.opener.open(request, timeout=40) as response:
                    ensure_lonab_url(response.geturl())
                    body = response.read(MAX_PDF_BYTES + 1)
                    content_type = response.headers.get_content_type()
                    self.last_request_at = time.monotonic()
                    return body, content_type
            except HTTPError as exc:
                self.last_request_at = time.monotonic()
                if exc.code in STOP_STATUSES:
                    retry_after = exc.headers.get("Retry-After")
                    detail = f"; Retry-After={retry_after}" if retry_after else ""
                    raise DownloaderError(
                        f"LONAB returned HTTP {exc.code}{detail}. Stopping the batch; do not bypass the block."
                    ) from exc
                if exc.code not in TRANSIENT_STATUSES or attempt >= retries:
                    raise DownloaderError(f"Request failed for {url}: HTTP {exc.code}") from exc
            except URLError as exc:
                self.last_request_at = time.monotonic()
                if attempt >= retries:
                    raise DownloaderError(f"Network error for {url}: {exc.reason}") from exc

            time.sleep(min(2 ** (attempt + 1), 8))
        raise DownloaderError(f"Request failed for {url}")


def ensure_lonab_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in {"lonab.bf", "www.lonab.bf"}:
        raise DownloaderError(f"Refusing non-LONAB URL: {url}")


def with_page(url: str, page: int) -> str:
    parsed = urlparse(url)
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    query["page"] = str(page)
    return urlunparse(parsed._replace(query=urlencode(query)))


def safe_filename(url: str) -> str:
    raw = Path(urlparse(url).path).name or "lonab.pdf"
    filename = re.sub(r"[^A-Za-z0-9._-]+", "_", raw)
    if not filename.lower().endswith(".pdf"):
        filename += ".pdf"
    return filename[:180]


def extract_pdf_candidates(html: str, page_url: str, kind: str) -> list[PdfCandidate]:
    parser = LinkParser()
    parser.feed(html)
    candidates: list[PdfCandidate] = []
    seen: set[str] = set()
    for href, title in parser.links:
        absolute = urljoin(page_url, href)
        parsed = urlparse(absolute)
        if parsed.hostname not in {"lonab.bf", "www.lonab.bf"}:
            continue
        if not parsed.path.lower().endswith(".pdf") or absolute in seen:
            continue
        seen.add(absolute)
        candidates.append(
            PdfCandidate(kind=kind, url=absolute, filename=safe_filename(absolute), title=title)
        )
    return candidates


def interleave(groups: Sequence[Sequence[PdfCandidate]]) -> list[PdfCandidate]:
    merged: list[PdfCandidate] = []
    for index in range(max((len(group) for group in groups), default=0)):
        for group in groups:
            if index < len(group):
                merged.append(group[index])
    return merged


def load_manifest(path: Path) -> dict[str, dict]:
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise DownloaderError(f"Cannot read manifest {path}: {exc}") from exc
    return data if isinstance(data, dict) else {}


def save_manifest(path: Path, records: dict[str, dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(
        json.dumps(records, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    temporary.replace(path)


def manifest_entry_is_valid(output_dir: Path, entry: object) -> bool:
    if not isinstance(entry, dict):
        return False
    filename = entry.get("filename")
    expected_digest = entry.get("sha256")
    if not isinstance(filename, str) or not isinstance(expected_digest, str):
        return False
    path = output_dir / filename
    if not path.is_file():
        return False
    return hashlib.sha256(path.read_bytes()).hexdigest() == expected_digest


def load_robots(client: PoliteClient) -> RobotFileParser:
    body, _ = client.get(ROBOTS_URL, retries=1)
    parser = RobotFileParser()
    parser.set_url(ROBOTS_URL)
    parser.parse(body.decode("utf-8", errors="replace").splitlines())
    return parser


def assert_allowed(robots: RobotFileParser, url: str) -> None:
    if not robots.can_fetch(USER_AGENT, url):
        raise DownloaderError(f"robots.txt does not allow this URL: {url}")


def discover(
    client: PoliteClient,
    robots: RobotFileParser,
    kinds: Iterable[str],
    pages: int,
) -> list[PdfCandidate]:
    grouped: list[list[PdfCandidate]] = []
    for kind in kinds:
        found: list[PdfCandidate] = []
        seen: set[str] = set()
        for page in range(pages):
            page_url = with_page(SOURCE_URLS[kind], page)
            assert_allowed(robots, page_url)
            body, _ = client.get(page_url)
            for candidate in extract_pdf_candidates(
                body.decode("utf-8", errors="replace"), page_url, kind
            ):
                if candidate.url not in seen:
                    found.append(candidate)
                    seen.add(candidate.url)
        grouped.append(found)
    return interleave(grouped)


def validate_pdf(body: bytes, content_type: str, url: str) -> None:
    if len(body) > MAX_PDF_BYTES:
        raise DownloaderError(f"PDF exceeds the {MAX_PDF_BYTES // (1024 * 1024)} MB safety limit: {url}")
    if not body.startswith(b"%PDF-"):
        raise DownloaderError(
            f"Downloaded content is not a PDF ({content_type or 'unknown type'}): {url}"
        )


def download_batch(
    client: PoliteClient,
    robots: RobotFileParser,
    candidates: Sequence[PdfCandidate],
    output_dir: Path,
    manifest_path: Path,
) -> tuple[int, int]:
    manifest = load_manifest(manifest_path)
    downloaded = 0
    skipped = 0
    output_dir.mkdir(parents=True, exist_ok=True)

    for candidate in candidates:
        if manifest_entry_is_valid(output_dir, manifest.get(candidate.url)):
            print(f"SKIP  {candidate.filename} (already in manifest)")
            skipped += 1
            continue
        assert_allowed(robots, candidate.url)
        print(f"GET   {candidate.url}")
        body, content_type = client.get(candidate.url)
        validate_pdf(body, content_type, candidate.url)
        digest = hashlib.sha256(body).hexdigest()
        destination = output_dir / candidate.filename
        if destination.exists():
            existing_digest = hashlib.sha256(destination.read_bytes()).hexdigest()
            if existing_digest != digest:
                destination = output_dir / f"{destination.stem}-{digest[:8]}.pdf"
        temporary = destination.with_suffix(destination.suffix + ".part")
        temporary.write_bytes(body)
        temporary.replace(destination)

        record = DownloadRecord(
            kind=candidate.kind,
            url=candidate.url,
            filename=destination.name,
            sha256=digest,
            size_bytes=len(body),
            downloaded_at=datetime.now(timezone.utc).isoformat(),
        )
        manifest[candidate.url] = asdict(record)
        save_manifest(manifest_path, manifest)
        downloaded += 1
        print(f"SAVE  {destination} ({len(body):,} bytes)")
    return downloaded, skipped


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Discover or download small batches of public LONAB PMU'B PDFs."
    )
    parser.add_argument(
        "--kind",
        choices=("programmes", "results", "both"),
        default="both",
        help="PDF category to discover (default: both).",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=DEFAULT_LIMIT,
        help=f"Maximum PDFs in this run, 1-{MAX_SAFE_BATCH} (default: {DEFAULT_LIMIT}).",
    )
    parser.add_argument(
        "--pages", type=int, default=1, help=f"Listing pages per category, 1-{MAX_PAGES}."
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=DEFAULT_DELAY_SECONDS,
        help=f"Minimum seconds between requests (default: {DEFAULT_DELAY_SECONDS}).",
    )
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument(
        "--download",
        action="store_true",
        help="Download the discovered PDFs. Without this flag, only show the plan.",
    )
    args = parser.parse_args(argv)
    if not 1 <= args.limit <= MAX_SAFE_BATCH:
        parser.error(f"--limit must be between 1 and {MAX_SAFE_BATCH}")
    if not 1 <= args.pages <= MAX_PAGES:
        parser.error(f"--pages must be between 1 and {MAX_PAGES}")
    if args.delay < 1:
        parser.error("--delay must be at least 1 second")
    return args


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    kinds = ("programmes", "results") if args.kind == "both" else (args.kind,)
    client = PoliteClient(delay_seconds=args.delay)
    try:
        robots = load_robots(client)
        candidates = discover(client, robots, kinds, args.pages)[: args.limit]
        if not candidates:
            print("No PDF links were discovered.")
            return 0

        print(f"Discovered {len(candidates)} PDF(s):")
        for candidate in candidates:
            print(f"  [{candidate.kind}] {candidate.filename} -> {candidate.url}")

        if not args.download:
            print("\nDry run only. Add --download to save this batch.")
            return 0

        manifest_path = args.output / "manifest.json"
        downloaded, skipped = download_batch(
            client, robots, candidates, args.output, manifest_path
        )
        print(f"\nComplete: {downloaded} downloaded, {skipped} already present.")
        return 0
    except DownloaderError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("\nStopped by user. Completed files remain recorded in the manifest.", file=sys.stderr)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
