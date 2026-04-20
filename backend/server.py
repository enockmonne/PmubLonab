import os
import re
import uuid
import logging
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Header, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

from race_data import (
    RACE_INFO,
    HORSES,
    EXPERT_PREDICTIONS,
    CLASSIFICATIONS,
    PREVIOUS_RESULTS,
    BETTING_INFO,
)
from pdf_parser import parse_pdf_to_race

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
ADMIN_PASSCODE = os.environ.get("ADMIN_PASSCODE", "pmub-admin-2026")

app = FastAPI(title="Le Journal Hippique API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ---------- Helpers ----------

def slugify(value: str) -> str:
    value = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode()
    value = re.sub(r"[^\w\s-]", "", value.lower()).strip()
    value = re.sub(r"[\s_-]+", "-", value)
    return value or "course"


def compute_consensus_for(horses: List[dict], predictions: List[dict]) -> List[dict]:
    nums = [h["number"] for h in horses]
    scores = {n: 0 for n in nums}
    apps = {n: 0 for n in nums}
    for p in predictions:
        picks = p.get("picks", []) or []
        for idx, num in enumerate(picks):
            if num not in scores:
                continue
            scores[num] += max(len(picks) - idx, 0)
            apps[num] += 1
    return sorted(
        [{"number": n, "score": scores[n], "appearances": apps[n]} for n in nums],
        key=lambda x: (-x["score"], -x["appearances"]),
    )


def enrich_race(doc: dict) -> dict:
    """Add consensus + strip _id for client response."""
    if doc is None:
        return None
    doc = {k: v for k, v in doc.items() if k != "_id"}
    horses = doc.get("horses", [])
    preds = doc.get("predictions", [])
    consensus = compute_consensus_for(horses, preds)
    cmap = {c["number"]: c for c in consensus}
    enriched_horses = []
    for h in horses:
        c = cmap.get(h["number"], {"score": 0, "appearances": 0})
        enriched_horses.append({**h, "consensus_score": c["score"], "consensus_appearances": c["appearances"]})
    return {**doc, "horses": enriched_horses, "consensus": consensus}


def build_race_doc(parsed: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize a parsed LLM output into a race document."""
    race = parsed.get("race") or {}
    date_iso = race.get("date_iso") or ""
    name = race.get("name") or "Course sans nom"
    location = race.get("location") or ""
    base_slug = slugify(f"{name}-{location}-{date_iso}")
    race_id = f"{base_slug}-{uuid.uuid4().hex[:6]}"

    doc = {
        "race_id": race_id,
        "name": name,
        "event_type": race.get("event_type", ""),
        "date_text": race.get("date_text", ""),
        "date_iso": date_iso,
        "location": location,
        "discipline": race.get("discipline", ""),
        "distance_m": int(race.get("distance_m") or 0),
        "runners": int(race.get("runners") or 0),
        "prize_euros": int(race.get("prize_euros") or 0),
        "prize_fcfa": int(race.get("prize_fcfa") or 0),
        "hero_image": RACE_INFO["hero_image"],
        "horses": parsed.get("horses", []) or [],
        "predictions": parsed.get("predictions", []) or [],
        "classifications": parsed.get("classifications", {}) or {},
        "previous_results": parsed.get("previous_results", {}) or {},
        "is_current": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    return doc


# ---------- Seeding ----------

async def seed_initial_race():
    """If races collection is empty, seed with the original PDF data and mark as current."""
    count = await db.races.count_documents({})
    if count > 0:
        return

    seed_doc = {
        "race_id": RACE_INFO["id"],
        "name": RACE_INFO["name"],
        "event_type": RACE_INFO["event_type"],
        "date_text": RACE_INFO["date"],
        "date_iso": RACE_INFO["date_iso"][:10],
        "location": RACE_INFO["location"],
        "discipline": RACE_INFO["discipline"],
        "distance_m": RACE_INFO["distance_m"],
        "runners": RACE_INFO["runners"],
        "prize_euros": RACE_INFO["prize_euros"],
        "prize_fcfa": RACE_INFO["prize_fcfa"],
        "hero_image": RACE_INFO["hero_image"],
        "horses": HORSES,
        "predictions": EXPERT_PREDICTIONS,
        "classifications": CLASSIFICATIONS,
        "previous_results": PREVIOUS_RESULTS,
        "is_current": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.races.insert_one(seed_doc)
    logger.info("Seeded initial race: %s", RACE_INFO["id"])


@app.on_event("startup")
async def on_startup():
    logger.info("EMERGENT_LLM_KEY configured: %s (len=%d)", bool(os.environ.get("EMERGENT_LLM_KEY")), len(os.environ.get("EMERGENT_LLM_KEY", "")))
    await seed_initial_race()


# ---------- Auth ----------

def check_admin(passcode: Optional[str]):
    if not passcode or passcode != ADMIN_PASSCODE:
        raise HTTPException(status_code=401, detail="Passcode invalide")


# ---------- Public endpoints ----------

@api_router.get("/")
async def root():
    return {"message": "Le Journal Hippique — PMU'B API", "ok": True}


async def _get_current_race_doc() -> Optional[dict]:
    doc = await db.races.find_one({"is_current": True})
    if not doc:
        doc = await db.races.find_one({}, sort=[("created_at", -1)])
    return doc


@api_router.get("/race")
async def get_current_race():
    doc = await _get_current_race_doc()
    if not doc:
        raise HTTPException(status_code=404, detail="Aucune course disponible")
    enriched = enrich_race(doc)
    return {
        "race": {
            "id": enriched["race_id"],
            "name": enriched["name"],
            "event_type": enriched["event_type"],
            "date": enriched["date_text"],
            "date_iso": enriched["date_iso"],
            "location": enriched["location"],
            "discipline": enriched["discipline"],
            "distance_m": enriched["distance_m"],
            "runners": enriched["runners"],
            "prize_euros": enriched["prize_euros"],
            "prize_fcfa": enriched["prize_fcfa"],
            "hero_image": enriched["hero_image"],
        },
        "betting": BETTING_INFO,
        "top_picks": enriched["consensus"][:3],
    }


@api_router.get("/horses")
async def get_horses():
    doc = await _get_current_race_doc()
    if not doc:
        return {"horses": [], "total": 0}
    enriched = enrich_race(doc)
    return {"horses": enriched["horses"], "total": len(enriched["horses"])}


@api_router.get("/horses/{horse_number}")
async def get_horse(horse_number: int):
    doc = await _get_current_race_doc()
    if not doc:
        raise HTTPException(status_code=404, detail="Aucune course disponible")
    enriched = enrich_race(doc)
    horse = next((h for h in enriched["horses"] if h["number"] == horse_number), None)
    if not horse:
        raise HTTPException(status_code=404, detail="Cheval introuvable")
    mentions = []
    for p in doc.get("predictions", []):
        picks = p.get("picks", [])
        if horse_number in picks:
            mentions.append({"source": p["source"], "rank": picks.index(horse_number) + 1})
    in_classifs = [c for c, nums in (doc.get("classifications", {}) or {}).items() if horse_number in nums]
    return {
        "horse": horse,
        "expert_mentions": mentions,
        "classifications": in_classifs,
        "consensus_score": horse.get("consensus_score", 0),
    }


@api_router.get("/predictions")
async def get_predictions():
    doc = await _get_current_race_doc()
    if not doc:
        return {"experts": [], "consensus": [], "classifications": {}}
    enriched = enrich_race(doc)
    return {
        "experts": doc.get("predictions", []),
        "consensus": enriched["consensus"],
        "classifications": doc.get("classifications", {}),
    }


@api_router.get("/results")
async def get_results():
    doc = await _get_current_race_doc()
    if not doc:
        return {"previous": {}}
    return {"previous": doc.get("previous_results", {})}


# ---------- Races library ----------

@api_router.get("/races")
async def list_races(
    q: Optional[str] = None,
    location: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
):
    query: Dict[str, Any] = {}
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        query["$or"] = [{"name": rx}, {"location": rx}, {"race_id": rx}]
    if location:
        query["location"] = {"$regex": re.escape(location), "$options": "i"}
    total = await db.races.count_documents(query)
    cursor = db.races.find(query, {"_id": 0}).sort("date_iso", -1).skip(skip).limit(limit)
    races = await cursor.to_list(length=limit)
    summary = [
        {
            "race_id": r["race_id"],
            "name": r.get("name"),
            "event_type": r.get("event_type"),
            "date_text": r.get("date_text"),
            "date_iso": r.get("date_iso"),
            "location": r.get("location"),
            "runners": r.get("runners"),
            "prize_fcfa": r.get("prize_fcfa"),
            "is_current": r.get("is_current", False),
            "has_results": bool((r.get("previous_results") or {}).get("finishing_order")),
        }
        for r in races
    ]
    return {"races": summary, "total": total, "limit": limit, "skip": skip}


@api_router.get("/races/current")
async def get_current_race_full():
    doc = await _get_current_race_doc()
    if not doc:
        raise HTTPException(status_code=404, detail="Aucune course actuelle")
    return enrich_race(doc)


@api_router.get("/races/{race_id}")
async def get_race_by_id(race_id: str):
    doc = await db.races.find_one({"race_id": race_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Course introuvable")
    return enrich_race(doc)


# ---------- Search ----------

@api_router.get("/search")
async def global_search(q: str = Query(..., min_length=2)):
    rx = {"$regex": re.escape(q), "$options": "i"}
    # Races
    races_cursor = db.races.find(
        {"$or": [{"name": rx}, {"location": rx}]}, {"_id": 0}
    ).sort("date_iso", -1).limit(10)
    races = await races_cursor.to_list(length=10)
    race_hits = [
        {
            "race_id": r["race_id"],
            "name": r.get("name"),
            "location": r.get("location"),
            "date_text": r.get("date_text"),
        }
        for r in races
    ]
    # Horses / jockeys / trainers: scan all races (dataset stays small — dozens/hundreds of PDFs)
    all_races = await db.races.find({}, {"_id": 0}).to_list(length=1000)
    horse_hits: Dict[str, dict] = {}
    jockey_hits: Dict[str, int] = {}
    trainer_hits: Dict[str, int] = {}
    ql = q.lower()
    for r in all_races:
        for h in r.get("horses", []) or []:
            if ql in (h.get("name") or "").lower():
                key = (h.get("name") or "").upper()
                entry = horse_hits.setdefault(key, {"name": key, "appearances": 0, "latest_race_id": r["race_id"], "latest_date": r.get("date_iso", "")})
                entry["appearances"] += 1
                if (r.get("date_iso") or "") >= (entry["latest_date"] or ""):
                    entry["latest_race_id"] = r["race_id"]
                    entry["latest_date"] = r.get("date_iso", "")
            if ql in (h.get("jockey") or "").lower():
                jockey_hits[h["jockey"]] = jockey_hits.get(h["jockey"], 0) + 1
            if ql in (h.get("trainer") or "").lower():
                trainer_hits[h["trainer"]] = trainer_hits.get(h["trainer"], 0) + 1
    return {
        "races": race_hits,
        "horses": list(horse_hits.values())[:20],
        "jockeys": [{"name": k, "appearances": v} for k, v in sorted(jockey_hits.items(), key=lambda x: -x[1])[:15]],
        "trainers": [{"name": k, "appearances": v} for k, v in sorted(trainer_hits.items(), key=lambda x: -x[1])[:15]],
    }


# ---------- Stats ----------

@api_router.get("/stats/horses/{name}")
async def horse_history(name: str):
    """Aggregate a horse's history across all races in DB."""
    target = name.upper().strip()
    all_races = await db.races.find({}, {"_id": 0}).sort("date_iso", -1).to_list(length=1000)
    appearances = []
    wins = 0
    places = 0  # top 3
    total_runs = 0
    for r in all_races:
        prev = r.get("previous_results", {}) or {}
        order = prev.get("finishing_order", []) or []
        # Find horse by name in this race's roster
        horse = next((h for h in r.get("horses", []) if (h.get("name") or "").upper() == target), None)
        if not horse:
            continue
        finishing_pos = None
        if order and horse.get("number") in order:
            finishing_pos = order.index(horse["number"]) + 1
        appearances.append({
            "race_id": r["race_id"],
            "race_name": r.get("name"),
            "date_text": r.get("date_text"),
            "date_iso": r.get("date_iso"),
            "location": r.get("location"),
            "number": horse.get("number"),
            "jockey": horse.get("jockey"),
            "trainer": horse.get("trainer"),
            "perf": horse.get("perf"),
            "finishing_pos": finishing_pos,
        })
        if finishing_pos is not None:
            total_runs += 1
            if finishing_pos == 1:
                wins += 1
            if finishing_pos <= 3:
                places += 1
    if not appearances:
        raise HTTPException(status_code=404, detail="Cheval introuvable dans l'historique")
    return {
        "name": target,
        "appearances": appearances,
        "stats": {
            "total_appearances": len(appearances),
            "total_runs_with_result": total_runs,
            "wins": wins,
            "places_top3": places,
            "win_rate": round((wins / total_runs) * 100, 1) if total_runs else 0,
            "place_rate": round((places / total_runs) * 100, 1) if total_runs else 0,
        },
    }


@api_router.get("/stats/tipsters")
async def tipsters_leaderboard():
    """Leaderboard: for each source, success rate = how often their #1 pick finished in top 3 of previous_results."""
    all_races = await db.races.find({}, {"_id": 0}).to_list(length=1000)
    agg: Dict[str, Dict[str, int]] = {}
    for r in all_races:
        order = (r.get("previous_results") or {}).get("finishing_order", []) or []
        if not order:
            continue
        winner = order[0]
        top3 = order[:3]
        for p in r.get("predictions", []) or []:
            src = p.get("source")
            picks = p.get("picks", []) or []
            if not src or not picks:
                continue
            entry = agg.setdefault(src, {"evaluated": 0, "top_pick_wins": 0, "top_pick_top3": 0, "base_in_top3": 0})
            entry["evaluated"] += 1
            if picks[0] == winner:
                entry["top_pick_wins"] += 1
            if picks[0] in top3:
                entry["top_pick_top3"] += 1
            if any(p in top3 for p in picks[:3]):
                entry["base_in_top3"] += 1
    leaderboard = []
    for src, v in agg.items():
        ev = v["evaluated"] or 1
        leaderboard.append({
            "source": src,
            "evaluated_races": v["evaluated"],
            "top_pick_wins": v["top_pick_wins"],
            "top_pick_top3": v["top_pick_top3"],
            "base_in_top3": v["base_in_top3"],
            "win_rate": round((v["top_pick_wins"] / ev) * 100, 1),
            "top3_rate": round((v["top_pick_top3"] / ev) * 100, 1),
        })
    leaderboard.sort(key=lambda x: (-x["top3_rate"], -x["win_rate"]))
    return {"leaderboard": leaderboard}


# ---------- Admin ----------

class SetCurrentPayload(BaseModel):
    pass


@api_router.post("/admin/races/upload")
async def admin_upload_race(
    file: UploadFile = File(...),
    x_admin_passcode: Optional[str] = Header(None, alias="X-Admin-Passcode"),
):
    check_admin(x_admin_passcode)
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Veuillez fournir un fichier .pdf")
    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="Fichier vide")
    try:
        parsed = await parse_pdf_to_race(pdf_bytes, session_id=f"upload-{uuid.uuid4().hex[:8]}")
    except Exception as e:
        logger.exception("PDF parse error")
        raise HTTPException(status_code=422, detail=f"Erreur de parsing: {e}")
    doc = build_race_doc(parsed)
    await db.races.insert_one(doc)
    return {"ok": True, "race_id": doc["race_id"], "summary": {
        "name": doc["name"], "location": doc["location"], "date": doc["date_text"],
        "runners": doc["runners"], "horses_parsed": len(doc["horses"]),
    }}


@api_router.post("/admin/races/{race_id}/set-current")
async def admin_set_current(
    race_id: str,
    x_admin_passcode: Optional[str] = Header(None, alias="X-Admin-Passcode"),
):
    check_admin(x_admin_passcode)
    doc = await db.races.find_one({"race_id": race_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Course introuvable")
    await db.races.update_many({}, {"$set": {"is_current": False}})
    await db.races.update_one({"race_id": race_id}, {"$set": {"is_current": True}})
    return {"ok": True, "race_id": race_id}


@api_router.delete("/admin/races/{race_id}")
async def admin_delete_race(
    race_id: str,
    x_admin_passcode: Optional[str] = Header(None, alias="X-Admin-Passcode"),
):
    check_admin(x_admin_passcode)
    res = await db.races.delete_one({"race_id": race_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Course introuvable")
    return {"ok": True}


@api_router.post("/admin/verify")
async def admin_verify(x_admin_passcode: Optional[str] = Header(None, alias="X-Admin-Passcode")):
    check_admin(x_admin_passcode)
    return {"ok": True}


# ---------- Favorites (kept) ----------

class FavoriteCreate(BaseModel):
    device_id: str
    horse_number: int


@api_router.post("/favorites")
async def add_favorite(payload: FavoriteCreate):
    doc = await _get_current_race_doc()
    if not doc or not any(h["number"] == payload.horse_number for h in doc.get("horses", [])):
        raise HTTPException(status_code=400, detail="Numéro de cheval invalide")
    fav = {
        "device_id": payload.device_id,
        "horse_number": payload.horse_number,
        "race_id": doc["race_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.favorites.update_one(
        {"device_id": payload.device_id, "horse_number": payload.horse_number, "race_id": doc["race_id"]},
        {"$set": fav}, upsert=True,
    )
    return fav


@api_router.delete("/favorites")
async def remove_favorite(device_id: str, horse_number: int):
    await db.favorites.delete_one({"device_id": device_id, "horse_number": horse_number})
    return {"ok": True}


@api_router.get("/favorites")
async def list_favorites(device_id: str):
    docs = await db.favorites.find({"device_id": device_id}, {"_id": 0}).to_list(100)
    return {"favorites": docs}


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
