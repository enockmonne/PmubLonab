import importlib.util
import contextlib
import io
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "download_lonab_pdfs.py"
SPEC = importlib.util.spec_from_file_location("download_lonab_pdfs", SCRIPT)
downloader = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules[SPEC.name] = downloader
SPEC.loader.exec_module(downloader)


class TestLonabDownloader(unittest.TestCase):
    def test_extract_pdf_candidates_keeps_only_lonab_pdfs(self):
        html = """
        <a href="/sites/default/files/2026-09/JH_PMUB_DU_27-09-2026.pdf">Programme</a>
        <a href="https://example.com/foreign.pdf">Foreign</a>
        <a href="/fr/node/123">Detail</a>
        <a href="/sites/default/files/2026-09/JH_PMUB_DU_27-09-2026.pdf">Duplicate</a>
        """

        candidates = downloader.extract_pdf_candidates(
            html, "https://lonab.bf/fr/programme-pmub?page=0", "programmes"
        )

        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0].filename, "JH_PMUB_DU_27-09-2026.pdf")
        self.assertEqual(candidates[0].kind, "programmes")

    def test_interleave_keeps_programmes_and_results_in_small_batch(self):
        programme = downloader.PdfCandidate("programmes", "https://lonab.bf/p1.pdf", "p1.pdf")
        programme_2 = downloader.PdfCandidate("programmes", "https://lonab.bf/p2.pdf", "p2.pdf")
        result = downloader.PdfCandidate("results", "https://lonab.bf/r1.pdf", "r1.pdf")

        merged = downloader.interleave([[programme, programme_2], [result]])

        self.assertEqual([item.filename for item in merged], ["p1.pdf", "r1.pdf", "p2.pdf"])

    def test_validate_pdf_rejects_html_response(self):
        with self.assertRaisesRegex(downloader.DownloaderError, "not a PDF"):
            downloader.validate_pdf(
                b"<html>blocked</html>", "text/html", "https://lonab.bf/file.pdf"
            )

    def test_parse_args_enforces_safe_batch_limit(self):
        with contextlib.redirect_stderr(io.StringIO()):
            with self.assertRaises(SystemExit):
                downloader.parse_args(["--limit", "11"])

    def test_non_lonab_url_is_rejected(self):
        with self.assertRaisesRegex(downloader.DownloaderError, "non-LONAB"):
            downloader.ensure_lonab_url("https://example.com/file.pdf")

    def test_manifest_entry_requires_the_recorded_file_and_hash(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            pdf = output / "sample.pdf"
            pdf.write_bytes(b"%PDF-1.4 sample")
            digest = downloader.hashlib.sha256(pdf.read_bytes()).hexdigest()
            entry = {"filename": pdf.name, "sha256": digest}

            self.assertTrue(downloader.manifest_entry_is_valid(output, entry))
            pdf.unlink()
            self.assertFalse(downloader.manifest_entry_is_valid(output, entry))


if __name__ == "__main__":
    unittest.main()
