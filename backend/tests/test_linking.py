import os
import asyncio

import pytest
from fastapi import HTTPException

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "pmub_test")
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("JWT_SECRET", "test-secret")

import server
from server import (
    canonical_pronostic_source,
    normalize_odds,
    normalize_weekly_best,
    odds_for_horse,
    order_programme_result_pair,
    official_results_for_race,
    score_programme_result_match,
)


class FakeRaceCursor:
    def __init__(self, documents):
        self.documents = documents

    async def to_list(self, length):
        return self.documents[:length]


class FakeRaceCollection:
    def __init__(self, documents):
        self.documents = documents
        self.updates = []

    def find(self, *_args, **_kwargs):
        return FakeRaceCursor(self.documents)

    async def update_one(self, query, update):
        self.updates.append((query, update))


class FakeDatabase:
    def __init__(self, documents):
        self.races = FakeRaceCollection(documents)


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


def test_order_programme_result_pair_accepts_either_order():
    programme = {"race_id": "programme-1", "doc_type": "programme"}
    result = {"race_id": "result-1", "doc_type": "result"}

    assert order_programme_result_pair(result, programme) == (programme, result)


def test_order_programme_result_pair_rejects_same_document_type():
    with pytest.raises(HTTPException) as exc:
        order_programme_result_pair(
            {"race_id": "programme-1", "doc_type": "programme"},
            {"race_id": "programme-2", "doc_type": "programme"},
        )

    assert exc.value.status_code == 400


def test_manual_link_is_symmetric_and_rebuild_safe(monkeypatch):
    fake_db = FakeDatabase([
        {"race_id": "programme-1", "doc_type": "programme", "name": "Programme"},
        {"race_id": "result-1", "doc_type": "result", "name": "Resultat"},
    ])
    monkeypatch.setattr(server, "db", fake_db)

    result = asyncio.run(
        server.set_manual_programme_result_link("programme-1", "result-1", True)
    )

    assert result["linked"] is True
    assert fake_db.races.updates == [
        (
            {"race_id": "programme-1"},
            {
                "$addToSet": {
                    "linked_result_ids": "result-1",
                    "manual_linked_result_ids": "result-1",
                },
                "$pull": {"excluded_link_ids": "result-1"},
            },
        ),
        (
            {"race_id": "result-1"},
            {
                "$addToSet": {
                    "linked_programme_ids": "programme-1",
                    "manual_linked_programme_ids": "programme-1",
                },
                "$pull": {"excluded_link_ids": "programme-1"},
            },
        ),
    ]


def test_manual_unlink_excludes_pair_from_automatic_relinking(monkeypatch):
    fake_db = FakeDatabase([
        {"race_id": "programme-1", "doc_type": "programme", "name": "Programme"},
        {"race_id": "result-1", "doc_type": "result", "name": "Resultat"},
    ])
    monkeypatch.setattr(server, "db", fake_db)

    result = asyncio.run(
        server.set_manual_programme_result_link("result-1", "programme-1", False)
    )

    assert result["linked"] is False
    assert fake_db.races.updates[0][1]["$addToSet"] == {
        "excluded_link_ids": "result-1"
    }
    assert fake_db.races.updates[1][1]["$addToSet"] == {
        "excluded_link_ids": "programme-1"
    }


@pytest.mark.parametrize("exclusion_side", ["programme", "result"])
def test_automatic_linking_respects_manual_exclusion(monkeypatch, exclusion_side):
    result_document = {
        "race_id": "result-1",
        "doc_type": "result",
        "name": "Prix Test",
        "date_iso": "2026-08-26",
        "location": "Deauville",
    }
    programme = {
        "race_id": "programme-1",
        "doc_type": "programme",
        "name": "Prix Test",
        "date_iso": "2026-08-26",
        "location": "Deauville",
    }
    if exclusion_side == "programme":
        programme["excluded_link_ids"] = ["result-1"]
    else:
        result_document["excluded_link_ids"] = ["programme-1"]

    fake_db = FakeDatabase([result_document])
    monkeypatch.setattr(server, "db", fake_db)

    links = asyncio.run(server.link_related_programme_results(programme))

    assert links == {"linked_programmes": [], "linked_results": []}
    assert fake_db.races.updates == []


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


def test_odds_for_horse_returns_matching_sources():
    odds = odds_for_horse(
        [
            {"source": "PARIS TURF", "values": [{"number": 1, "odds": "7/1"}]},
            {"source": "Tierce Magazine", "values": [{"number": 1, "odds": "5/1"}]},
            {"source": "Paris Turf", "values": [{"number": 2, "odds": "8/1"}]},
        ],
        1,
    )

    assert odds == [
        {"source": "Paris Turf", "odds": "7/1"},
        {"source": "Tierce Magazine", "odds": "5/1"},
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
