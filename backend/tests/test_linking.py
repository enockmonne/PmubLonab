import os

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "pmub_test")
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("JWT_SECRET", "test-secret")

from server import score_programme_result_match


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
