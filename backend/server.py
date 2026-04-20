from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone

from race_data import (
    RACE_INFO,
    HORSES,
    EXPERT_PREDICTIONS,
    CLASSIFICATIONS,
    PREVIOUS_RESULTS,
    BETTING_INFO,
    compute_consensus,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Le Journal Hippique API")
api_router = APIRouter(prefix="/api")


class FavoriteCreate(BaseModel):
    device_id: str
    horse_number: int


class Favorite(BaseModel):
    device_id: str
    horse_number: int
    created_at: str


@api_router.get("/")
async def root():
    return {"message": "Le Journal Hippique — PMU'B API", "ok": True}


@api_router.get("/race")
async def get_race():
    consensus = compute_consensus()
    top3 = consensus[:3]
    return {
        "race": RACE_INFO,
        "betting": BETTING_INFO,
        "top_picks": top3,
    }


@api_router.get("/horses")
async def get_horses():
    consensus_map = {c["number"]: c for c in compute_consensus()}
    enriched = []
    for h in HORSES:
        c = consensus_map.get(h["number"], {"score": 0, "appearances": 0})
        enriched.append({**h, "consensus_score": c["score"], "consensus_appearances": c["appearances"]})
    return {"horses": enriched, "total": len(enriched)}


@api_router.get("/horses/{horse_number}")
async def get_horse(horse_number: int):
    horse = next((h for h in HORSES if h["number"] == horse_number), None)
    if not horse:
        raise HTTPException(status_code=404, detail="Cheval introuvable")
    mentions = []
    for pred in EXPERT_PREDICTIONS:
        if horse_number in pred["picks"]:
            rank = pred["picks"].index(horse_number) + 1
            mentions.append({"source": pred["source"], "rank": rank})
    in_classifications = [cat for cat, nums in CLASSIFICATIONS.items() if horse_number in nums]
    consensus = next((c for c in compute_consensus() if c["number"] == horse_number), {"score": 0})
    return {
        "horse": horse,
        "expert_mentions": mentions,
        "classifications": in_classifications,
        "consensus_score": consensus["score"],
    }


@api_router.get("/predictions")
async def get_predictions():
    return {
        "experts": EXPERT_PREDICTIONS,
        "consensus": compute_consensus(),
        "classifications": CLASSIFICATIONS,
    }


@api_router.get("/results")
async def get_results():
    return {"previous": PREVIOUS_RESULTS}


@api_router.post("/favorites")
async def add_favorite(payload: FavoriteCreate):
    if not any(h["number"] == payload.horse_number for h in HORSES):
        raise HTTPException(status_code=400, detail="Numéro de cheval invalide")
    doc = {
        "device_id": payload.device_id,
        "horse_number": payload.horse_number,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.favorites.update_one(
        {"device_id": payload.device_id, "horse_number": payload.horse_number},
        {"$set": doc},
        upsert=True,
    )
    return doc


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

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
