"""Auth utilities: JWT tokens + bcrypt password hashing.

Single-admin design: stores admin user in MongoDB collection `admin_users`.
"""
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from passlib.context import CryptContext
from fastapi import Header, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase


# bcrypt context — passlib auto-detects bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(password, hashed)
    except Exception:
        return False


def _jwt_secret() -> str:
    secret = os.environ.get("JWT_SECRET")
    if not secret:
        # Generate a deterministic-ish secret based on Mongo DB name as fallback.
        # In production, ALWAYS set JWT_SECRET in .env.
        secret = "pmub-jwt-fallback-" + (os.environ.get("DB_NAME") or "default")
    return secret


JWT_ALGO = "HS256"
JWT_TTL_DAYS = 7


def create_access_token(payload: dict, expires_days: int = JWT_TTL_DAYS) -> str:
    to_encode = dict(payload)
    expire = datetime.now(timezone.utc) + timedelta(days=expires_days)
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jwt.encode(to_encode, _jwt_secret(), algorithm=JWT_ALGO)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, _jwt_secret(), algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


async def require_admin(
    db: AsyncIOMotorDatabase,
    authorization: Optional[str] = None,
    x_admin_passcode: Optional[str] = None,
) -> dict:
    """Validate JWT in Authorization header. Falls back to legacy X-Admin-Passcode header
    for backwards compatibility during migration.
    """
    # Modern: Bearer token
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        payload = decode_access_token(token)
        if not payload:
            raise HTTPException(status_code=401, detail="Token invalide ou expiré.")
        # Optional: refresh user lookup
        user = await db.admin_users.find_one({"email": payload.get("email")})
        if not user:
            raise HTTPException(status_code=401, detail="Utilisateur introuvable.")
        return {"email": user["email"], "role": user.get("role", "admin")}

    # Legacy fallback
    legacy_passcode = os.environ.get("ADMIN_PASSCODE", "pmub-admin-2026")
    if x_admin_passcode and x_admin_passcode == legacy_passcode:
        return {"email": "legacy@pmub.app", "role": "admin"}

    raise HTTPException(status_code=401, detail="Authentification requise.")


async def ensure_seed_admin(db: AsyncIOMotorDatabase):
    """Idempotent seed: creates an initial admin from env vars if collection is empty."""
    if await db.admin_users.count_documents({}) > 0:
        return
    email = os.environ.get("ADMIN_EMAIL")
    password = os.environ.get("ADMIN_PASSWORD")
    if not email or not password:
        return
    await db.admin_users.insert_one(
        {
            "email": email.lower().strip(),
            "password_hash": hash_password(password),
            "role": "admin",
            "created_at": datetime.now(timezone.utc),
            "last_login_at": None,
        }
    )
