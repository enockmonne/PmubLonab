"""Backend tests for Le Journal Hippique multi-race features (search, stats, admin)."""
import os
import io
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "http://localhost:8001").rstrip("/")
ADMIN_PASSCODE = os.environ.get("ADMIN_PASSCODE")
SEED_RACE_ID = "prix-pavillon-royal-2026-04-12"


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    return s


# -------- /api/races list --------
class TestRacesList:
    def test_list_paginated(self, api):
        r = api.get(f"{BASE_URL}/api/races", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert "races" in data and "total" in data
        assert data["limit"] == 20 and data["skip"] == 0
        assert isinstance(data["races"], list) and len(data["races"]) >= 1
        seeded = next((x for x in data["races"] if x["race_id"] == SEED_RACE_ID), None)
        assert seeded is not None, "seeded race not found in list"
        assert seeded["is_current"] is True
        assert seeded["has_results"] is True

    def test_list_filter_q_pavillon(self, api):
        r = api.get(f"{BASE_URL}/api/races", params={"q": "pavillon"}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data["total"] >= 1
        assert all("pavillon" in (x.get("name", "") + x.get("location", "") + x.get("race_id", "")).lower()
                   for x in data["races"])

    def test_list_filter_has_results(self, api):
        r = api.get(f"{BASE_URL}/api/races", params={"has_results": "true"}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data["total"] >= 1
        seeded = next((x for x in data["races"] if x["race_id"] == SEED_RACE_ID), None)
        assert seeded is not None, "seeded race with previous results not found"
        assert seeded["has_results"] is True
        assert seeded["finishing_order"][:5] == [4, 14, 3, 9, 16]


# -------- /api/races/{id} and /api/races/current --------
class TestRaceDetail:
    def test_get_current(self, api):
        r = api.get(f"{BASE_URL}/api/races/current", timeout=30)
        assert r.status_code == 200
        doc = r.json()
        assert doc["race_id"] == SEED_RACE_ID
        assert "consensus" in doc and isinstance(doc["consensus"], list) and len(doc["consensus"]) > 0
        assert all("consensus_score" in h for h in doc["horses"])
        assert "_id" not in doc

    def test_get_by_id(self, api):
        r = api.get(f"{BASE_URL}/api/races/{SEED_RACE_ID}", timeout=30)
        assert r.status_code == 200
        doc = r.json()
        assert doc["name"] == "Prix du Pavillon Royal"
        assert isinstance(doc["consensus"], list) and len(doc["consensus"]) == len(doc["horses"])

    def test_unknown_id_404(self, api):
        r = api.get(f"{BASE_URL}/api/races/does-not-exist-xyz", timeout=30)
        assert r.status_code == 404


# -------- Legacy endpoints still work --------
class TestLegacy:
    def test_legacy_race(self, api):
        r = api.get(f"{BASE_URL}/api/race", timeout=30)
        assert r.status_code == 200
        assert r.json()["race"]["name"] == "Prix du Pavillon Royal"

    def test_legacy_horses(self, api):
        r = api.get(f"{BASE_URL}/api/horses", timeout=30)
        assert r.status_code == 200
        assert r.json()["total"] == 16

    def test_legacy_horse_detail(self, api):
        r = api.get(f"{BASE_URL}/api/horses/8", timeout=30)
        assert r.status_code == 200
        assert r.json()["horse"]["name"] == "MARINALEDA"

    def test_legacy_predictions(self, api):
        r = api.get(f"{BASE_URL}/api/predictions", timeout=30)
        assert r.status_code == 200
        assert len(r.json()["experts"]) >= 1

    def test_legacy_results(self, api):
        r = api.get(f"{BASE_URL}/api/results", timeout=30)
        assert r.status_code == 200
        assert "previous" in r.json()


# -------- /api/search --------
class TestSearch:
    def test_search_marinaleda(self, api):
        r = api.get(f"{BASE_URL}/api/search", params={"q": "MARINALEDA"}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        names = [h["name"] for h in data["horses"]]
        assert names.count("MARINALEDA") == 1

    def test_search_pouchin_jockey(self, api):
        r = api.get(f"{BASE_URL}/api/search", params={"q": "Pouchin"}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        jockey_names = [j["name"] for j in data["jockeys"]]
        assert any("Pouchin" in n for n in jockey_names), f"No jockey with Pouchin found: {jockey_names}"

    def test_search_too_short_422(self, api):
        r = api.get(f"{BASE_URL}/api/search", params={"q": "x"}, timeout=30)
        assert r.status_code == 422


# -------- /api/stats/horses/{name} --------
class TestHorseStats:
    def test_stats_zulu_warrior(self, api):
        r = api.get(f"{BASE_URL}/api/stats/horses/ZULU%20WARRIOR", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data["appearances"], list) and len(data["appearances"]) >= 1
        stats = data["stats"]
        for field in ("total_appearances", "wins", "places_top3", "win_rate", "place_rate"):
            assert field in stats
            assert isinstance(stats[field], (int, float))

    def test_stats_not_found(self, api):
        r = api.get(f"{BASE_URL}/api/stats/horses/NON_EXISTENT_HORSE_ZZZ", timeout=30)
        assert r.status_code == 404


# -------- /api/stats/tipsters --------
class TestTipsters:
    def test_tipsters_leaderboard(self, api):
        r = api.get(f"{BASE_URL}/api/stats/tipsters", timeout=30)
        assert r.status_code == 200
        data = r.json()
        lb = data["leaderboard"]
        assert isinstance(lb, list) and len(lb) >= 1
        for entry in lb:
            for k in ("source", "evaluated_races", "top_pick_wins", "top3_rate", "win_rate"):
                assert k in entry, f"missing key {k} in {entry}"
            assert isinstance(entry["evaluated_races"], int)
            assert isinstance(entry["top_pick_wins"], int)
            assert isinstance(entry["top3_rate"], (int, float))
            assert isinstance(entry["win_rate"], (int, float))


# -------- Admin --------
class TestAdmin:
    def test_verify_ok(self, api):
        if not ADMIN_PASSCODE:
            pytest.skip("ADMIN_PASSCODE is not configured")
        r = api.post(f"{BASE_URL}/api/admin/verify",
                     headers={"X-Admin-Passcode": ADMIN_PASSCODE}, timeout=30)
        assert r.status_code == 200
        assert r.json() == {"ok": True}

    def test_verify_wrong_passcode(self, api):
        r = api.post(f"{BASE_URL}/api/admin/verify",
                     headers={"X-Admin-Passcode": "wrong"}, timeout=30)
        assert r.status_code == 401

    def test_verify_missing_passcode(self, api):
        r = api.post(f"{BASE_URL}/api/admin/verify", timeout=30)
        assert r.status_code == 401

    def test_upload_without_passcode_401(self, api):
        # no passcode
        files = {"file": ("dummy.pdf", io.BytesIO(b"%PDF-1.4 fake"), "application/pdf")}
        r = api.post(f"{BASE_URL}/api/admin/races/upload", files=files, timeout=30)
        assert r.status_code == 401

    def test_upload_non_pdf_400(self, api):
        if not ADMIN_PASSCODE:
            pytest.skip("ADMIN_PASSCODE is not configured")
        files = {"file": ("dummy.txt", io.BytesIO(b"hello world"), "text/plain")}
        r = api.post(f"{BASE_URL}/api/admin/races/upload",
                     files=files,
                     headers={"X-Admin-Passcode": ADMIN_PASSCODE}, timeout=30)
        assert r.status_code == 400

    def test_lonab_import_without_passcode_401(self, api):
        r = api.post(
            f"{BASE_URL}/api/admin/imports/lonab/import",
            json={"pdf_urls": ["https://lonab.bf/example.pdf"]},
            timeout=30,
        )
        assert r.status_code == 401

    def test_lonab_import_empty_selection_400(self, api):
        if not ADMIN_PASSCODE:
            pytest.skip("ADMIN_PASSCODE is not configured")
        r = api.post(
            f"{BASE_URL}/api/admin/imports/lonab/import",
            json={"pdf_urls": []},
            headers={"X-Admin-Passcode": ADMIN_PASSCODE},
            timeout=30,
        )
        assert r.status_code == 400

    def test_lonab_import_rejects_non_lonab_url(self, api):
        if not ADMIN_PASSCODE:
            pytest.skip("ADMIN_PASSCODE is not configured")
        r = api.post(
            f"{BASE_URL}/api/admin/imports/lonab/import",
            json={"pdf_urls": ["https://example.com/file.pdf"]},
            headers={"X-Admin-Passcode": ADMIN_PASSCODE},
            timeout=30,
        )
        assert r.status_code == 400

    def test_lonab_import_limited_to_five_pdfs(self, api):
        if not ADMIN_PASSCODE:
            pytest.skip("ADMIN_PASSCODE is not configured")
        r = api.post(
            f"{BASE_URL}/api/admin/imports/lonab/import",
            json={"pdf_urls": [f"https://lonab.bf/file-{i}.pdf" for i in range(6)]},
            headers={"X-Admin-Passcode": ADMIN_PASSCODE},
            timeout=30,
        )
        assert r.status_code == 400

    def test_set_current_unknown_404(self, api):
        if not ADMIN_PASSCODE:
            pytest.skip("ADMIN_PASSCODE is not configured")
        r = api.post(f"{BASE_URL}/api/admin/races/unknown-race-xyz/set-current",
                     headers={"X-Admin-Passcode": ADMIN_PASSCODE}, timeout=30)
        assert r.status_code == 404

    def test_set_current_valid(self, api):
        if not ADMIN_PASSCODE:
            pytest.skip("ADMIN_PASSCODE is not configured")
        # set seeded race as current; verify /api/race reflects it
        r = api.post(f"{BASE_URL}/api/admin/races/{SEED_RACE_ID}/set-current",
                     headers={"X-Admin-Passcode": ADMIN_PASSCODE}, timeout=30)
        assert r.status_code == 200
        assert r.json()["race_id"] == SEED_RACE_ID

        r2 = api.get(f"{BASE_URL}/api/race", timeout=30)
        assert r2.status_code == 200
        assert r2.json()["race"]["id"] == SEED_RACE_ID

    def test_set_current_wrong_passcode(self, api):
        r = api.post(f"{BASE_URL}/api/admin/races/{SEED_RACE_ID}/set-current",
                     headers={"X-Admin-Passcode": "wrong"}, timeout=30)
        assert r.status_code == 401

    def test_delete_unknown_404(self, api):
        if not ADMIN_PASSCODE:
            pytest.skip("ADMIN_PASSCODE is not configured")
        r = api.delete(f"{BASE_URL}/api/admin/races/unknown-race-xyz",
                       headers={"X-Admin-Passcode": ADMIN_PASSCODE}, timeout=30)
        assert r.status_code == 404

    def test_delete_without_passcode_401(self, api):
        r = api.delete(f"{BASE_URL}/api/admin/races/unknown-race-xyz", timeout=30)
        assert r.status_code == 401
