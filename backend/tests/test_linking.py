import os

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "pmub_test")
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("JWT_SECRET", "test-secret")

from server import (
    canonical_pronostic_source,
    normalize_odds,
    normalize_weekly_best,
    official_results_for_race,
    score_programme_result_match,
)


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


def test_official_results_prefers_linked_result_for_programme():
    race = {
        "race_id": "programme-1",
        "doc_type": "programme",
        "previous_results": {"finishing_order": [1, 2, 3]},
        "linked_result_ids": ["result-1"],
    }
    result = {
        "race_id": "result-1",
        "doc_type": "result",
        "previous_results": {"finishing_order": [9, 8, 7]},
    }

    context = official_results_for_race(race, {"programme-1": race, "result-1": result})

    assert context["source"] == "linked_result"
    assert context["result_race_id"] == "result-1"
    assert context["results"]["finishing_order"] == [9, 8, 7]


def test_official_results_uses_linked_result_when_programme_has_no_results():
    race = {
        "race_id": "programme-1",
        "doc_type": "programme",
        "previous_results": {},
        "linked_result_ids": ["result-1"],
    }
    result = {
        "race_id": "result-1",
        "doc_type": "result",
        "previous_results": {"finishing_order": [9, 8, 7]},
    }

    context = official_results_for_race(race, {"programme-1": race, "result-1": result})

    assert context["source"] == "linked_result"
    assert context["result_race_id"] == "result-1"
    assert context["results"]["finishing_order"] == [9, 8, 7]


def test_official_results_uses_embedded_results_for_result_document():
    result = {
        "race_id": "result-1",
        "doc_type": "result",
        "previous_results": {"finishing_order": [9, 8, 7]},
    }

    context = official_results_for_race(result, {"result-1": result})

    assert context["source"] == "embedded"
    assert context["result_race_id"] == "result-1"
    assert context["results"]["finishing_order"] == [9, 8, 7]


def test_canonical_pronostic_source_rolls_up_variants():
    variants = ["L'Alsace", "L’ALSACE", "l alsace", " L ALSACE "]

    normalized = {canonical_pronostic_source(source) for source in variants}

    assert normalized == {("l alsace", "L'Alsace")}


def test_canonical_pronostic_source_preserves_unknown_display_name():
    assert canonical_pronostic_source("Mon Journal Turf") == (
        "mon journal turf",
        "Mon Journal Turf",
    )


def test_canonical_pronostic_source_rolls_up_brand_variants():
    cases = {
        "ParisTurf": ("paris turf", "ParisTurf"),
        "PARIS TURF": ("paris turf", "ParisTurf"),
        "paris-turf.com": ("paris turf", "ParisTurf"),
        "Turf.fr": ("turf fr com", "Turf-fr.com"),
        "TURF-FR.COM": ("turf fr com", "Turf-fr.com"),
        "ZoneTurf": ("zone turf fr", "Zone-Turf.fr"),
        "Zone-Turf.fr": ("zone turf fr", "Zone-Turf.fr"),
        "LeParisien": ("le parisien", "Le Parisien"),
        "VoixDuNord": ("voix du nord", "Voix du Nord"),
    }

    for raw, expected in cases.items():
        assert canonical_pronostic_source(raw) == expected


def test_normalize_odds_keeps_known_tables_and_values():
    odds = normalize_odds([
        {
            "source": "PARIS TURF",
            "values": [
                {"number": "1", "odds": "7/1"},
                {"number": 2, "odds": "8/1"},
                {"number": 0, "odds": "bad"},
            ],
        },
        {
            "source": "Tiercé Magazine",
            "values": [{"number": 1, "odds": "5/1"}],
        },
    ])

    assert odds == [
        {
            "source": "Paris Turf",
            "values": [
                {"number": 1, "odds": "7/1"},
                {"number": 2, "odds": "8/1"},
            ],
        },
        {"source": "Tierce Magazine", "values": [{"number": 1, "odds": "5/1"}]},
    ]


def test_normalize_weekly_best_keeps_ranked_people():
    weekly = normalize_weekly_best({
        "trainers": [{"rank": "1", "name": "TH. DUVALDESTIN"}, "M. SASSIER"],
        "drivers": [{"rank": 1, "name": "E. RAFFIN"}, {"rank": "", "name": "B. ROCHARD"}],
    })

    assert weekly == {
        "trainers": [
            {"rank": 1, "name": "TH. DUVALDESTIN"},
            {"rank": 2, "name": "M. SASSIER"},
        ],
        "drivers": [
            {"rank": 1, "name": "E. RAFFIN"},
            {"rank": 2, "name": "B. ROCHARD"},
        ],
    }
