"""Backend tests for Le Journal Hippique API."""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "http://localhost:8001").rstrip("/")


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---- Race info ----
class TestRace:
    def test_bootstrap(self, api):
        r = api.get(f"{BASE_URL}/api/bootstrap", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data["counts"]["programmes"] >= 1
        assert data["counts"]["total"] >= data["counts"]["programmes"]
        assert "resultats" in data["counts"]
        assert data["current_race"]["race_id"]
        assert data["current_race"]["name"]

    def test_get_race(self, api):
        r = api.get(f"{BASE_URL}/api/race", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data["race"]["name"] == "Prix du Pavillon Royal"
        assert data["race"]["location"] == "ParisLongchamp"
        assert data["race"]["runners"] == 16
        assert data["race"]["prize_euros"] == 50900
        assert data["race"]["prize_fcfa"] == 33500000
        assert "betting" in data
        assert len(data["top_picks"]) == 3
        assert data["top_picks"][0]["number"] == 8


# ---- Horses ----
class TestHorses:
    def test_list_horses(self, api):
        r = api.get(f"{BASE_URL}/api/horses", timeout=30)
        assert r.status_code == 200
        data = r.json()
        horses = data["horses"]
        assert data["total"] == 16
        assert len(horses) == 16
        nums = [h["number"] for h in horses]
        assert nums == list(range(1, 17))
        for h in horses:
            assert "name" in h and h["name"]
            assert "jockey" in h
            assert "trainer" in h
            assert h["consensus_score"] >= 0
            assert h["consensus_appearances"] <= 7

    def test_get_horse_8(self, api):
        r = api.get(f"{BASE_URL}/api/horses/8", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data["horse"]["name"] == "MARINALEDA"
        assert len(data["expert_mentions"]) > 0
        assert data["consensus_score"] > 0

    def test_get_horse_999_404(self, api):
        r = api.get(f"{BASE_URL}/api/horses/999", timeout=30)
        assert r.status_code == 404


# ---- Predictions ----
class TestPredictions:
    def test_predictions(self, api):
        r = api.get(f"{BASE_URL}/api/predictions", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert len(data["experts"]) == 7
        assert len(data["consensus"]) == 16
        cats = set(data["classifications"].keys())
        assert cats == {"Forme", "Classe", "Progrès", "Régularité"}


# ---- Results ----
class TestResults:
    def test_results(self, api):
        r = api.get(f"{BASE_URL}/api/results", timeout=30)
        assert r.status_code == 200
        data = r.json()
        prev = data["previous"]
        assert prev["race_name"] == "Prix de la Gloriette"
        assert prev["finishing_order"] == [4, 14, 3, 9, 16]
        assert isinstance(prev["payouts"], list) and len(prev["payouts"]) > 0


# ---- Favorites ----
class TestFavorites:
    device = "TEST_testdev"

    def test_add_list_delete_favorite(self, api):
        # cleanup first
        api.delete(f"{BASE_URL}/api/favorites", params={"device_id": self.device, "horse_number": 1}, timeout=30)

        r = api.post(f"{BASE_URL}/api/favorites",
                     json={"device_id": self.device, "horse_number": 1}, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["device_id"] == self.device
        assert body["horse_number"] == 1
        assert "_id" not in body

        # list
        r = api.get(f"{BASE_URL}/api/favorites", params={"device_id": self.device}, timeout=30)
        assert r.status_code == 200
        favs = r.json()["favorites"]
        assert any(f["horse_number"] == 1 for f in favs)
        for f in favs:
            assert "_id" not in f

        # delete
        r = api.delete(f"{BASE_URL}/api/favorites",
                       params={"device_id": self.device, "horse_number": 1}, timeout=30)
        assert r.status_code == 200

        r = api.get(f"{BASE_URL}/api/favorites", params={"device_id": self.device}, timeout=30)
        favs = r.json()["favorites"]
        assert not any(f["horse_number"] == 1 for f in favs)

    def test_invalid_horse_number(self, api):
        r = api.post(f"{BASE_URL}/api/favorites",
                     json={"device_id": "TEST_x", "horse_number": 99}, timeout=30)
        assert r.status_code == 400
