import os

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "pmub_test")
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("JWT_SECRET", "test-secret")

from server import official_results_for_race, score_programme_result_match


def test_programme_result_match_scores_same_date():
    programme = {
        "doc_type": "programme",
        "name": "Prix de la Commune de Cordemais",
        "date_iso": "2026-04-15",
        "location": "Cordemais",
    }
    result = {
        "doc_type": "result",
        "name": "Resultats Prix de la Commune",
        "date_iso": "2026-04-15",
        "location": "Cordemais",
    }

    assert score_programme_result_match(programme, result) >= 8


def test_programme_result_match_rejects_different_date():
    programme = {
        "doc_type": "programme",
        "name": "Prix de la Commune de Cordemais",
        "date_iso": "2026-04-15",
        "location": "Cordemais",
    }
    result = {
        "doc_type": "result",
        "name": "Resultats Prix de la Commune",
        "date_iso": "2026-04-16",
        "location": "Cordemais",
    }

    assert score_programme_result_match(programme, result) < 5


def test_official_results_prefers_embedded_results():
    race = {
        "race_id": "programme-1",
        "previous_results": {"finishing_order": [1, 2, 3]},
        "linked_result_ids": ["result-1"],
    }
    result = {
        "race_id": "result-1",
        "previous_results": {"finishing_order": [9, 8, 7]},
    }

    context = official_results_for_race(race, {"programme-1": race, "result-1": result})

    assert context["source"] == "embedded"
    assert context["result_race_id"] == "programme-1"
    assert context["results"]["finishing_order"] == [1, 2, 3]


def test_official_results_uses_linked_result_when_programme_has_no_results():
    race = {
        "race_id": "programme-1",
        "previous_results": {},
        "linked_result_ids": ["result-1"],
    }
    result = {
        "race_id": "result-1",
        "previous_results": {"finishing_order": [9, 8, 7]},
    }

    context = official_results_for_race(race, {"programme-1": race, "result-1": result})

    assert context["source"] == "linked_result"
    assert context["result_race_id"] == "result-1"
    assert context["results"]["finishing_order"] == [9, 8, 7]
