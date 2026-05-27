import os
import re
import uuid
import asyncio
import logging
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Header, Query, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
import requests

from race_data import (
    RACE_INFO,
    HORSES,
    EXPERT_PREDICTIONS,
    CLASSIFICATIONS,
    PREVIOUS_RESULTS,
    BETTING_INFO,
)
from pdf_parser import parse_pdf_to_race, check_llm_health
from auth import (
    require_admin,
    create_access_token,
    verify_password,
    hash_password,
    ensure_seed_admin,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
ADMIN_PASSCODE = os.environ.get("ADMIN_PASSCODE")

app = FastAPI(title="Le Journal Hippique API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def _cors_origins() -> List[str]:
    raw = os.environ.get("CORS_ORIGINS", "")
    if not raw:
        return ["http://localhost:8081", "http://localhost:5173"]
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


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


def normalize_betting(raw: Optional[Dict[str, Any]] = None) -> Dict[str, str]:
    """Return a complete betting footer, falling back to the original race data."""
    raw = raw or {}
    return {
        "arret_jeux_weekday": str(raw.get("arret_jeux_weekday") or BETTING_INFO.get("arret_jeux_weekday", "")),
        "arret_jeux_weekend": str(raw.get("arret_jeux_weekend") or BETTING_INFO.get("arret_jeux_weekend", "")),
        "arret_jeux_nocturne": str(raw.get("arret_jeux_nocturne") or BETTING_INFO.get("arret_jeux_nocturne", "")),
        "daylight_saving_note": str(raw.get("daylight_saving_note") or BETTING_INFO.get("daylight_saving_note", "")),
        "customer_service": str(raw.get("customer_service") or BETTING_INFO.get("customer_service", "")),
    }


def build_parse_quality(parsed: Dict[str, Any], doc_type: str) -> Dict[str, Any]:
    race = parsed.get("race") or {}
    horses = parsed.get("horses", []) or []
    predictions = parsed.get("predictions", []) or []
    classifications = parsed.get("classifications", {}) or {}
    prev = parsed.get("previous_results", {}) or {}
    betting = parsed.get("betting", {}) or {}
    expected_runners = int(race.get("runners") or 0)
    horses_count = len(horses)
    warnings = []

    if doc_type == "programme":
        if expected_runners and horses_count != expected_runners:
            warnings.append(f"Chevaux extraits: {horses_count}/{expected_runners}.")
        if horses_count == 0:
            warnings.append("Aucun cheval extrait.")
        if not predictions:
            warnings.append("Aucun pronostic extrait.")
    if not prev.get("finishing_order"):
        warnings.append("Aucun resultat/rapport officiel extrait.")
    if not any(str(v or "").strip() for v in betting.values()):
        warnings.append("Aucune information 'Arret des jeux' extraite.")

    return {
        "doc_type": doc_type,
        "expected_runners": expected_runners,
        "horses_count": horses_count,
        "predictions_count": len(predictions),
        "classifications_count": len(classifications),
        "has_predictions": bool(predictions),
        "has_classifications": bool(classifications),
        "has_previous_results": bool(prev.get("finishing_order")),
        "has_betting_info": any(str(v or "").strip() for v in betting.values()),
        "warnings": warnings,
    }


def build_race_doc(parsed: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize a parsed LLM output into a race document."""
    race = parsed.get("race") or {}
    date_iso = race.get("date_iso") or ""
    name = race.get("name") or "Course sans nom"
    location = race.get("location") or ""
    base_slug = slugify(f"{name}-{location}-{date_iso}")
    race_id = f"{base_slug}-{uuid.uuid4().hex[:6]}"

    horses = parsed.get("horses", []) or []
    prev = parsed.get("previous_results", {}) or {}
    has_finishing = bool(prev.get("finishing_order"))
    # doc_type: 'programme' if full programme (horses present), else 'result' (result-only PDF)
    doc_type = "programme" if len(horses) > 0 else ("result" if has_finishing else "programme")
    parse_quality = build_parse_quality(parsed, doc_type)

    doc = {
        "race_id": race_id,
        "doc_type": doc_type,
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
        "editorial_synthesis": parsed.get("editorial_synthesis", "") or "",
        "horses": horses,
        "predictions": parsed.get("predictions", []) or [],
        "classifications": parsed.get("classifications", {}) or {},
        "classement": parsed.get("classement", {}) or {},
        "betting": normalize_betting(parsed.get("betting") or {}),
        "previous_results": prev,
        "parse_quality": parse_quality,
        "is_current": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    return doc


async def _send_push_messages(messages: List[dict]) -> Dict[str, Any]:
    """Send messages through Expo Push Service without blocking the event loop."""
    if not messages:
        return {"sent": 0, "tickets": []}

    def _post():
        res = requests.post(
            "https://exp.host/--/api/v2/push/send",
            json=messages,
            headers={
                "Accept": "application/json",
                "Accept-Encoding": "gzip, deflate",
                "Content-Type": "application/json",
            },
            timeout=30,
        )
        if res.status_code >= 400:
            raise ValueError(f"Expo push error {res.status_code}: {res.text[:300]}")
        return res.json()

    body = await asyncio.to_thread(_post)
    return {"sent": len(messages), "tickets": body.get("data", [])}


async def _send_push_to_topic(
    topic: str,
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> Dict[str, Any]:
    cursor = db.push_tokens.find(
        {"enabled": True, "topics": topic},
        {"_id": 0, "token": 1},
    ).limit(500)
    docs = await cursor.to_list(length=500)
    messages = [
        {
            "to": doc["token"],
            "sound": "default",
            "title": title,
            "body": body,
            "data": data or {},
        }
        for doc in docs
        if doc.get("token", "").startswith("ExponentPushToken[")
    ]
    return await _send_push_messages(messages)


# ---------- Seeding ----------

async def seed_initial_race():
    """If races collection is empty, seed with the original PDF data and mark as current."""
    count = await db.races.count_documents({})
    if count > 0:
        return

    seed_doc = {
        "race_id": RACE_INFO["id"],
        "doc_type": "programme",
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
        "betting": normalize_betting(BETTING_INFO),
        "previous_results": PREVIOUS_RESULTS,
        "is_current": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.races.insert_one(seed_doc)
    logger.info("Seeded initial race: %s", RACE_INFO["id"])


async def ensure_indexes():
    await db.races.create_index("race_id", unique=True)
    await db.races.create_index([("date_iso", -1)])
    await db.races.create_index("doc_type")
    await db.races.create_index("is_current")
    await db.favorites.create_index([("device_id", 1), ("race_id", 1), ("horse_number", 1)], unique=True)
    await db.push_tokens.create_index("token", unique=True)
    await db.push_tokens.create_index("device_id")
    await db.push_tokens.create_index("topics")


@app.on_event("startup")
async def on_startup():
    logger.info("GEMINI_API_KEY configured: %s", bool(os.environ.get("GEMINI_API_KEY")))
    await ensure_indexes()
    await seed_initial_race()
    await ensure_seed_admin(db)


# ---------- Auth ----------

class LoginPayload(BaseModel):
    email: str
    password: str


class ChangePasswordPayload(BaseModel):
    old_password: str
    new_password: str


@api_router.post("/auth/login")
async def auth_login(payload: LoginPayload):
    email = (payload.email or "").lower().strip()
    user = await db.admin_users.find_one({"email": email})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect.")
    await db.admin_users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login_at": datetime.now(timezone.utc)}},
    )
    await _log_admin_action(email, "auth.login", {})
    token = create_access_token({"email": email, "role": user.get("role", "admin")})
    return {
        "token": token,
        "user": {
            "email": email,
            "role": user.get("role", "admin"),
        },
    }


@api_router.get("/auth/me")
async def auth_me(authorization: Optional[str] = Header(None)):
    user = await require_admin(db, authorization=authorization)
    return user


@api_router.post("/auth/change-password")
async def auth_change_password(
    payload: ChangePasswordPayload,
    authorization: Optional[str] = Header(None),
):
    me = await require_admin(db, authorization=authorization)
    user = await db.admin_users.find_one({"email": me["email"]})
    if not user or not verify_password(payload.old_password, user.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Ancien mot de passe incorrect.")
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="Le mot de passe doit faire au moins 8 caractères.")
    await db.admin_users.update_one(
        {"_id": user["_id"]},
        {"$set": {"password_hash": hash_password(payload.new_password)}},
    )
    return {"ok": True}


def check_admin(passcode: Optional[str]):
    if not passcode or passcode != ADMIN_PASSCODE:
        raise HTTPException(status_code=401, detail="Passcode invalide")


# ---------- Public endpoints ----------

@api_router.get("/")
async def root():
    return {"message": "Le Journal Hippique — PMU'B API", "ok": True}


# ---------- Announcements (AD3) ----------

class AnnouncementPayload(BaseModel):
    message: str
    level: Optional[str] = "info"  # info | success | warning | error
    active: Optional[bool] = True
    notify: Optional[bool] = False


@api_router.get("/announcements/active")
async def get_active_announcement():
    """Public endpoint: returns the most recent active announcement, or null."""
    doc = await db.announcements.find_one(
        {"active": True}, sort=[("created_at", -1)], projection={"_id": 0}
    )
    return {"announcement": doc}


@api_router.get("/admin/announcements")
async def list_announcements(
    authorization: Optional[str] = Header(None),
    x_admin_passcode: Optional[str] = Header(None, alias="X-Admin-Passcode"),
):
    await require_admin(db, authorization=authorization, x_admin_passcode=x_admin_passcode)
    items = await db.announcements.find({}, projection={"_id": 0}).sort("created_at", -1).to_list(length=50)
    return {"announcements": items}


@api_router.post("/admin/announcements")
async def create_announcement(
    payload: AnnouncementPayload,
    authorization: Optional[str] = Header(None),
    x_admin_passcode: Optional[str] = Header(None, alias="X-Admin-Passcode"),
):
    me = await require_admin(db, authorization=authorization, x_admin_passcode=x_admin_passcode)
    doc = {
        "id": str(uuid.uuid4()),
        "message": payload.message.strip(),
        "level": payload.level or "info",
        "active": bool(payload.active),
        "created_at": datetime.now(timezone.utc),
        "created_by": me.get("email"),
    }
    # Deactivate any other active announcement (single banner at a time)
    if doc["active"]:
        await db.announcements.update_many({"active": True}, {"$set": {"active": False}})
    await db.announcements.insert_one(doc)
    await _log_admin_action(me.get("email"), "announcement.create", {"id": doc["id"], "message": doc["message"]})
    if payload.notify and doc["active"]:
        asyncio.create_task(_send_push_to_topic(
            "announcements",
            "PMU'B",
            doc["message"],
            {"type": "announcement", "id": doc["id"]},
        ))
    return {"ok": True, "announcement": {k: v for k, v in doc.items() if k != "_id"}}


@api_router.delete("/admin/announcements/{ann_id}")
async def delete_announcement(
    ann_id: str,
    authorization: Optional[str] = Header(None),
    x_admin_passcode: Optional[str] = Header(None, alias="X-Admin-Passcode"),
):
    me = await require_admin(db, authorization=authorization, x_admin_passcode=x_admin_passcode)
    res = await db.announcements.delete_one({"id": ann_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Annonce introuvable")
    await _log_admin_action(me.get("email"), "announcement.delete", {"id": ann_id})
    return {"ok": True}


# ---------- Admin Activity Logs (AD4) ----------

async def _log_admin_action(email: Optional[str], action: str, meta: Optional[dict] = None):
    try:
        await db.admin_logs.insert_one({
            "id": str(uuid.uuid4()),
            "email": email or "unknown",
            "action": action,
            "meta": meta or {},
            "created_at": datetime.now(timezone.utc),
        })
    except Exception as e:
        logger.warning("log fail: %s", e)


@api_router.get("/admin/logs")
async def list_admin_logs(
    limit: int = 50,
    authorization: Optional[str] = Header(None),
    x_admin_passcode: Optional[str] = Header(None, alias="X-Admin-Passcode"),
):
    await require_admin(db, authorization=authorization, x_admin_passcode=x_admin_passcode)
    items = await db.admin_logs.find({}, projection={"_id": 0}).sort("created_at", -1).to_list(length=min(limit, 200))
    return {"logs": items}


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
            "editorial_synthesis": enriched.get("editorial_synthesis", ""),
        },
        "betting": normalize_betting(enriched.get("betting") or {}),
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
        return {"experts": [], "consensus": [], "classifications": {}, "classement": {}}
    enriched = enrich_race(doc)
    return {
        "experts": doc.get("predictions", []),
        "consensus": enriched["consensus"],
        "classifications": doc.get("classifications", {}),
        "classement": doc.get("classement", {}),
    }


@api_router.get("/results")
async def get_results():
    doc = await _get_current_race_doc()
    if not doc:
        return {"previous": {}}
    return {"previous": doc.get("previous_results", {})}


# ---------- Push notifications ----------

class PushTokenPayload(BaseModel):
    token: str
    device_id: str
    platform: Optional[str] = None
    topics: Optional[List[str]] = None


class PushPreferencesPayload(BaseModel):
    device_id: str
    enabled: bool = True
    topics: Optional[List[str]] = None


class AdminPushPayload(BaseModel):
    title: str
    body: str
    topic: Optional[str] = "race_updates"
    data: Optional[Dict[str, Any]] = None


DEFAULT_PUSH_TOPICS = ["race_updates", "results", "announcements"]


@api_router.post("/push/register")
async def register_push_token(payload: PushTokenPayload):
    token = payload.token.strip()
    if not token.startswith("ExponentPushToken["):
        raise HTTPException(status_code=400, detail="Token Expo invalide")
    topics = payload.topics or DEFAULT_PUSH_TOPICS
    doc = {
        "token": token,
        "device_id": payload.device_id.strip(),
        "platform": payload.platform or "",
        "topics": sorted(set(topics)),
        "enabled": True,
        "updated_at": datetime.now(timezone.utc),
    }
    await db.push_tokens.update_one(
        {"token": token},
        {"$set": doc, "$setOnInsert": {"created_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    return {"ok": True, "topics": doc["topics"]}


@api_router.post("/push/preferences")
async def update_push_preferences(payload: PushPreferencesPayload):
    topics = sorted(set(payload.topics or DEFAULT_PUSH_TOPICS))
    res = await db.push_tokens.update_many(
        {"device_id": payload.device_id.strip()},
        {
            "$set": {
                "enabled": bool(payload.enabled),
                "topics": topics,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )
    return {"ok": True, "matched": res.matched_count, "topics": topics}


@api_router.post("/admin/notifications/send")
async def admin_send_notification(
    payload: AdminPushPayload,
    authorization: Optional[str] = Header(None),
    x_admin_passcode: Optional[str] = Header(None, alias="X-Admin-Passcode"),
):
    me = await require_admin(db, authorization=authorization, x_admin_passcode=x_admin_passcode)
    result = await _send_push_to_topic(
        payload.topic or "race_updates",
        payload.title.strip(),
        payload.body.strip(),
        payload.data or {},
    )
    await _log_admin_action(me.get("email"), "notification.send", {"topic": payload.topic, "sent": result["sent"]})
    return {"ok": True, **result}


# ---------- Races library ----------

@api_router.get("/races")
async def list_races(
    q: Optional[str] = None,
    location: Optional[str] = None,
    doc_type: Optional[str] = None,
    has_results: Optional[bool] = None,
    limit: int = Query(20, ge=1, le=500),
    skip: int = Query(0, ge=0),
):
    query: Dict[str, Any] = {}
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        query["$or"] = [{"name": rx}, {"location": rx}, {"race_id": rx}]
    if location:
        query["location"] = {"$regex": re.escape(location), "$options": "i"}
    if doc_type in ("programme", "result"):
        query["doc_type"] = doc_type
    if has_results is True:
        query["previous_results.finishing_order.0"] = {"$exists": True}
    elif has_results is False:
        query["previous_results.finishing_order.0"] = {"$exists": False}
    total = await db.races.count_documents(query)
    cursor = db.races.find(query, {"_id": 0}).sort("date_iso", -1).skip(skip).limit(limit)
    races = await cursor.to_list(length=limit)
    summary = [
        {
            "race_id": r["race_id"],
            "doc_type": r.get("doc_type", "programme"),
            "name": r.get("name"),
            "event_type": r.get("event_type"),
            "date_text": r.get("date_text"),
            "date_iso": r.get("date_iso"),
            "location": r.get("location"),
            "runners": r.get("runners"),
            "prize_fcfa": r.get("prize_fcfa"),
            "is_current": r.get("is_current", False),
            "has_results": bool((r.get("previous_results") or {}).get("finishing_order")),
            "finishing_order": (r.get("previous_results") or {}).get("finishing_order", [])[:5],
            "top_payout": next(
                (p for p in (r.get("previous_results") or {}).get("payouts", []) if p.get("type", "").lower() == "ordre"),
                None,
            ),
        }
        for r in races
    ]
    return {"races": summary, "total": total, "limit": limit, "skip": skip}


@api_router.get("/races/current")
async def get_current_race_full():
    doc = await _get_current_race_doc()
    if not doc:
        raise HTTPException(status_code=404, detail="Aucune course actuelle")
    enriched = enrich_race(doc)
    return {**enriched, "betting": normalize_betting(enriched.get("betting") or {})}


@api_router.get("/races/{race_id}")
async def get_race_by_id(race_id: str):
    doc = await db.races.find_one({"race_id": race_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Course introuvable")
    enriched = enrich_race(doc)
    return {**enriched, "betting": normalize_betting(enriched.get("betting") or {})}


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

@api_router.get("/stats/horses/leaderboard")
async def horse_leaderboard():
    """Top horses by wins and top-3 finishes across races with official results."""
    races = await db.races.find({}, {"_id": 0}).sort("date_iso", -1).to_list(length=1000)
    stats: Dict[str, Dict[str, Any]] = {}

    for r in races:
        order = (r.get("previous_results") or {}).get("finishing_order", []) or []
        if not order:
            continue
        for horse in r.get("horses", []) or []:
            name = (horse.get("name") or "").strip()
            number = horse.get("number")
            if not name or number not in order:
                continue
            key = name.upper()
            finishing_pos = order.index(number) + 1
            entry = stats.setdefault(key, {
                "name": name,
                "runs": 0,
                "wins": 0,
                "top3": 0,
                "latest_race_id": r.get("race_id"),
                "latest_date": r.get("date_iso", ""),
                "latest_number": number,
            })
            entry["runs"] += 1
            if finishing_pos == 1:
                entry["wins"] += 1
            if finishing_pos <= 3:
                entry["top3"] += 1
            if (r.get("date_iso") or "") >= (entry.get("latest_date") or ""):
                entry["latest_race_id"] = r.get("race_id")
                entry["latest_date"] = r.get("date_iso", "")
                entry["latest_number"] = number

    leaderboard = []
    for entry in stats.values():
        runs = entry["runs"] or 1
        leaderboard.append({
            **entry,
            "win_rate": round((entry["wins"] / runs) * 100, 1),
            "top3_rate": round((entry["top3"] / runs) * 100, 1),
        })

    by_wins = sorted(leaderboard, key=lambda x: (-x["win_rate"], -x["wins"], -x["runs"], x["name"]))[:20]
    by_top3 = sorted(leaderboard, key=lambda x: (-x["top3_rate"], -x["top3"], -x["runs"], x["name"]))[:20]
    return {
        "by_wins": by_wins,
        "by_top3": by_top3,
        "total_horses": len(leaderboard),
        "evaluated_races": sum(1 for r in races if (r.get("previous_results") or {}).get("finishing_order")),
    }


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


@api_router.get("/stats/people")
async def people_leaderboard():
    """Top jockeys & entraîneurs based on top-3 finishes across all races.
    Cross-references result docs (finishing_order) with programme docs (horses)."""
    races = await db.races.find({}, {"_id": 0}).to_list(length=1000)
    # Build a lookup: date_iso -> list of programmes with horses
    prog_by_date: Dict[str, List[dict]] = {}
    for r in races:
        if r.get("doc_type") == "programme" and r.get("horses"):
            prog_by_date.setdefault(r.get("date_iso", ""), []).append(r)

    jockey_stats: Dict[str, Dict[str, int]] = {}
    trainer_stats: Dict[str, Dict[str, int]] = {}

    def add_finish(stats: Dict[str, Dict[str, int]], name: str, rank: int):
        if not name:
            return
        e = stats.setdefault(name, {"races": 0, "wins": 0, "top3": 0})
        e["races"] += 1
        if rank == 1:
            e["wins"] += 1
        if rank <= 3:
            e["top3"] += 1

    for r in races:
        order = (r.get("previous_results") or {}).get("finishing_order", []) or []
        if not order:
            continue
        # Find matching programme on same date OR fallback to current race's horses
        date_iso = r.get("date_iso", "")
        progs = prog_by_date.get(date_iso, [])
        # Also include the current race's horses if doc_type is programme
        if r.get("doc_type") == "programme" and r.get("horses"):
            progs = progs + [r]
        # Combine all horses from all programmes of that day for lookup
        horses_lookup: Dict[int, dict] = {}
        for p in progs:
            for h in p.get("horses", []):
                num = h.get("number")
                if num is not None:
                    horses_lookup[num] = h
        if not horses_lookup:
            continue
        for idx, num in enumerate(order[:5]):
            horse = horses_lookup.get(num)
            if not horse:
                continue
            rank = idx + 1
            add_finish(jockey_stats, horse.get("jockey", ""), rank)
            add_finish(trainer_stats, horse.get("trainer", ""), rank)

    def build(stats: Dict[str, Dict[str, int]]):
        out = []
        for name, v in stats.items():
            races_n = v["races"] or 1
            out.append({
                "name": name,
                "races": v["races"],
                "wins": v["wins"],
                "top3": v["top3"],
                "win_rate": round((v["wins"] / races_n) * 100, 1),
                "top3_rate": round((v["top3"] / races_n) * 100, 1),
            })
        out.sort(key=lambda x: (-x["wins"], -x["top3"], -x["races"]))
        return out

    return {
        "jockeys": build(jockey_stats),
        "trainers": build(trainer_stats),
    }


# ---------- Admin ----------

class SetCurrentPayload(BaseModel):
    pass


@api_router.post("/admin/races/upload")
async def admin_upload_race(
    file: UploadFile = File(...),
    x_admin_passcode: Optional[str] = Header(None, alias="X-Admin-Passcode"),
    authorization: Optional[str] = Header(None),
):
    me = await require_admin(db, authorization=authorization, x_admin_passcode=x_admin_passcode)
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
    await _log_admin_action(me.get("email"), "race.upload", {"race_id": doc["race_id"], "name": doc["name"], "doc_type": doc.get("doc_type")})
    return {"ok": True, "race_id": doc["race_id"], "summary": {
        "name": doc["name"], "location": doc["location"], "date": doc["date_text"],
        "runners": doc["runners"], "horses_parsed": len(doc["horses"]),
        "doc_type": doc.get("doc_type"),
        "parse_quality": doc.get("parse_quality", {}),
    }}


@api_router.post("/admin/races/{race_id}/set-current")
async def admin_set_current(
    race_id: str,
    x_admin_passcode: Optional[str] = Header(None, alias="X-Admin-Passcode"),
    authorization: Optional[str] = Header(None),
):
    me = await require_admin(db, authorization=authorization, x_admin_passcode=x_admin_passcode)
    doc = await db.races.find_one({"race_id": race_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Course introuvable")
    await db.races.update_many({}, {"$set": {"is_current": False}})
    await db.races.update_one({"race_id": race_id}, {"$set": {"is_current": True}})
    await _log_admin_action(me.get("email"), "race.set_current", {"race_id": race_id, "name": doc.get("name")})
    asyncio.create_task(_send_push_to_topic(
        "race_updates",
        "Nouvelle course disponible",
        doc.get("name") or "Le programme a ete mis a jour.",
        {"type": "race", "race_id": race_id},
    ))
    return {"ok": True, "race_id": race_id}


@api_router.delete("/admin/races/{race_id}")
async def admin_delete_race(
    race_id: str,
    x_admin_passcode: Optional[str] = Header(None, alias="X-Admin-Passcode"),
    authorization: Optional[str] = Header(None),
):
    me = await require_admin(db, authorization=authorization, x_admin_passcode=x_admin_passcode)
    res = await db.races.delete_one({"race_id": race_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Course introuvable")
    await _log_admin_action(me.get("email"), "race.delete", {"race_id": race_id})
    return {"ok": True}
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Course introuvable")
    return {"ok": True}


@api_router.post("/admin/verify")
async def admin_verify(x_admin_passcode: Optional[str] = Header(None, alias="X-Admin-Passcode")):
    check_admin(x_admin_passcode)
    return {"ok": True}


@api_router.get("/admin/status")
async def admin_status(
    x_admin_passcode: Optional[str] = Header(None, alias="X-Admin-Passcode"),
    authorization: Optional[str] = Header(None),
):
    """Dashboard metrics for admin home."""
    me = await require_admin(db, authorization=authorization, x_admin_passcode=x_admin_passcode)

    total_races = await db.races.count_documents({})
    total_programmes = await db.races.count_documents({"doc_type": "programme"})
    total_results = await db.races.count_documents({"doc_type": "result"})
    current = await db.races.find_one({"is_current": True}, {"_id": 0, "race_id": 1, "name": 1, "date_text": 1, "location": 1})
    last = await db.races.find_one({}, sort=[("created_at", -1)], projection={"_id": 0, "race_id": 1, "name": 1, "date_text": 1, "created_at": 1, "doc_type": 1})

    # LLM key health: try a tiny direct Gemini ping.
    llm_health = await check_llm_health()

    # Admin user info
    admin_user = await db.admin_users.find_one(
        {"email": me.get("email")},
        {"_id": 0, "email": 1, "last_login_at": 1, "created_at": 1, "role": 1},
    )

    return {
        "stats": {
            "total_races": total_races,
            "programmes": total_programmes,
            "results": total_results,
        },
        "current_race": current,
        "last_upload": last,
        "llm": {
            "status": llm_health["status"],
            "error": llm_health["error"],
        },
        "admin": admin_user or {"email": me.get("email"), "role": me.get("role")},
    }


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
    allow_origins=_cors_origins(),
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Admin Web (static SPA preview) ----------
# Serve the built Vite admin app at /api/admin-ui/.
# This is for in-environment preview only; production deployments should host
# the dist/ folder on Vercel/Netlify/etc. with VITE_BASE=/ at build time.
ADMIN_WEB_DIST = ROOT_DIR.parent / "admin-web" / "dist"
if ADMIN_WEB_DIST.exists():
    app.mount(
        "/api/admin-ui/assets",
        StaticFiles(directory=str(ADMIN_WEB_DIST / "assets")),
        name="admin-web-assets",
    )

    @app.get("/api/admin-ui/{full_path:path}", include_in_schema=False)
    async def serve_admin_spa(full_path: str):
        # Try to serve a real file first (e.g. favicon, manifest)
        candidate = ADMIN_WEB_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        # Fallback to index.html for client-side routing
        return FileResponse(ADMIN_WEB_DIST / "index.html")

    logger.info(f"Admin Web mounted at /api/admin-ui from {ADMIN_WEB_DIST}")
else:
    logger.warning(f"Admin Web dist not found at {ADMIN_WEB_DIST} (run `cd admin-web && yarn build`)")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
