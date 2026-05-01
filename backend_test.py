"""Backend tests for Phase 3: JWT auth + Admin dashboard.

Tests:
- POST /api/auth/login (valid, invalid email, invalid password, missing fields)
- GET /api/auth/me (valid token, no header, garbage token)
- POST /api/auth/change-password (valid, wrong old, short new — then revert)
- GET /api/admin/status (Bearer JWT, legacy passcode, no auth)
- Backwards compat for protected admin endpoints (set-current with both,
  delete with no auth, delete on non-existent race, upload without auth)
"""
import os
import sys
from typing import Optional

import requests

# Resolve backend URL from frontend/.env (REACT_APP_BACKEND_URL or EXPO_PUBLIC_BACKEND_URL)
def _load_backend_url() -> str:
    env_path = "/app/frontend/.env"
    base: Optional[str] = None
    try:
        with open(env_path, "r") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" not in line:
                    continue
                k, v = line.split("=", 1)
                v = v.strip().strip('"').strip("'")
                if k.strip() in ("REACT_APP_BACKEND_URL", "EXPO_PUBLIC_BACKEND_URL"):
                    base = v
                    break
    except Exception as e:
        print(f"Could not read {env_path}: {e}")
    if not base:
        base = "http://localhost:8001"
    return base.rstrip("/")


BASE = _load_backend_url()
API = f"{BASE}/api"
EMAIL = "enockmoonne.admin@pmub.app"
PASSWORD = "@Unlimited86"
LEGACY_PASSCODE = "pmub-admin-2026"

results = []  # (name, passed, details)

def record(name: str, passed: bool, details: str = ""):
    results.append((name, passed, details))
    flag = "PASS" if passed else "FAIL"
    print(f"[{flag}] {name} :: {details}")


def test_login_valid() -> Optional[str]:
    r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=15)
    ok = r.status_code == 200
    token = None
    details = f"status={r.status_code}"
    if ok:
        try:
            data = r.json()
            token = data.get("token")
            user = data.get("user") or {}
            ok = bool(token) and user.get("email", "").lower() == EMAIL.lower() and user.get("role") == "admin"
            details += f" token_len={len(token or '')} user={user}"
        except Exception as e:
            ok = False
            details += f" parse_err={e}"
    else:
        details += f" body={r.text[:200]}"
    record("POST /api/auth/login (valid)", ok, details)
    return token if ok else None


def test_login_invalid_email():
    r = requests.post(f"{API}/auth/login", json={"email": "nobody@pmub.app", "password": PASSWORD}, timeout=10)
    ok = r.status_code == 401
    detail = ""
    try:
        detail = r.json().get("detail", "")
    except Exception:
        pass
    msg_ok = "Email ou mot de passe incorrect" in detail
    record("POST /api/auth/login (invalid email)", ok and msg_ok, f"status={r.status_code} detail={detail!r}")


def test_login_invalid_password():
    r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": "wrong-password-xyz"}, timeout=10)
    ok = r.status_code == 401
    detail = ""
    try:
        detail = r.json().get("detail", "")
    except Exception:
        pass
    msg_ok = "Email ou mot de passe incorrect" in detail
    record("POST /api/auth/login (invalid password)", ok and msg_ok, f"status={r.status_code} detail={detail!r}")


def test_login_missing_fields():
    r = requests.post(f"{API}/auth/login", json={"email": EMAIL}, timeout=10)
    ok = r.status_code == 422
    record("POST /api/auth/login (missing password → 422)", ok, f"status={r.status_code}")


def test_me_valid(token: str):
    r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"}, timeout=10)
    ok = r.status_code == 200
    body = {}
    if ok:
        try:
            body = r.json()
            ok = body.get("email", "").lower() == EMAIL.lower() and body.get("role") == "admin"
        except Exception:
            ok = False
    record("GET /api/auth/me (valid Bearer)", ok, f"status={r.status_code} body={body}")


def test_me_no_header():
    r = requests.get(f"{API}/auth/me", timeout=10)
    ok = r.status_code == 401
    record("GET /api/auth/me (no auth → 401)", ok, f"status={r.status_code}")


def test_me_bad_token():
    r = requests.get(f"{API}/auth/me", headers={"Authorization": "Bearer garbage.token.value"}, timeout=10)
    ok = r.status_code == 401
    record("GET /api/auth/me (garbage token → 401)", ok, f"status={r.status_code}")


def test_change_password_short_new(token: str):
    r = requests.post(
        f"{API}/auth/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={"old_password": PASSWORD, "new_password": "short1"},
        timeout=10,
    )
    ok = r.status_code == 400
    record("POST /api/auth/change-password (new <8 → 400)", ok, f"status={r.status_code}")


def test_change_password_wrong_old(token: str):
    r = requests.post(
        f"{API}/auth/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={"old_password": "definitely-not-the-real-pwd", "new_password": "AnotherStrong#2026"},
        timeout=10,
    )
    ok = r.status_code == 400
    record("POST /api/auth/change-password (wrong old → 400)", ok, f"status={r.status_code}")


def test_change_password_roundtrip(token: str):
    """Change to a new password, login with new, then revert back."""
    new_pwd = "Temp@PhoenixSky9!"
    r1 = requests.post(
        f"{API}/auth/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={"old_password": PASSWORD, "new_password": new_pwd},
        timeout=10,
    )
    ok1 = r1.status_code == 200 and (r1.json() or {}).get("ok") is True
    record("POST /api/auth/change-password (valid → 200)", ok1, f"status={r1.status_code} body={r1.text[:120]}")
    if not ok1:
        return  # don't continue — prevents lock-out

    # Verify login with new password works
    r2 = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": new_pwd}, timeout=10)
    ok2 = r2.status_code == 200 and bool((r2.json() or {}).get("token"))
    new_token = (r2.json() or {}).get("token") if ok2 else None
    record("POST /api/auth/login (after change → new pwd)", ok2, f"status={r2.status_code}")

    # Revert back using new token (or the original token, both should still be valid since secret didn't rotate)
    revert_token = new_token or token
    r3 = requests.post(
        f"{API}/auth/change-password",
        headers={"Authorization": f"Bearer {revert_token}"},
        json={"old_password": new_pwd, "new_password": PASSWORD},
        timeout=10,
    )
    ok3 = r3.status_code == 200 and (r3.json() or {}).get("ok") is True
    record("POST /api/auth/change-password (revert → 200)", ok3, f"status={r3.status_code}")

    # Ensure original password works again
    r4 = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=10)
    ok4 = r4.status_code == 200
    record("POST /api/auth/login (with original pwd after revert)", ok4, f"status={r4.status_code}")


def _validate_admin_status_shape(body: dict) -> (bool, str):
    try:
        stats = body.get("stats") or {}
        for k in ("total_races", "programmes", "results"):
            if k not in stats:
                return False, f"missing stats.{k}"
        if "current_race" not in body:
            return False, "missing current_race"
        if "last_upload" not in body:
            return False, "missing last_upload"
        llm = body.get("llm") or {}
        if "status" not in llm or "error" not in llm:
            return False, "missing llm.status/llm.error"
        if llm.get("status") not in ("ok", "error"):
            return False, f"llm.status not in ok/error: {llm.get('status')}"
        admin = body.get("admin") or {}
        if "email" not in admin:
            return False, "missing admin.email"
        return True, f"stats={stats} llm={llm} admin={admin}"
    except Exception as e:
        return False, f"shape err {e}"


def test_admin_status_with_jwt(token: str):
    r = requests.get(f"{API}/admin/status", headers={"Authorization": f"Bearer {token}"}, timeout=60)
    ok = r.status_code == 200
    detail = f"status={r.status_code}"
    if ok:
        body = r.json()
        ok_shape, info = _validate_admin_status_shape(body)
        ok = ok_shape
        detail += f" {info}"
    else:
        detail += f" body={r.text[:200]}"
    record("GET /api/admin/status (Bearer JWT)", ok, detail)


def test_admin_status_with_legacy():
    r = requests.get(f"{API}/admin/status", headers={"X-Admin-Passcode": LEGACY_PASSCODE}, timeout=60)
    ok = r.status_code == 200
    detail = f"status={r.status_code}"
    if ok:
        body = r.json()
        ok_shape, info = _validate_admin_status_shape(body)
        ok = ok_shape
        detail += f" {info}"
    else:
        detail += f" body={r.text[:200]}"
    record("GET /api/admin/status (legacy passcode)", ok, detail)


def test_admin_status_no_auth():
    r = requests.get(f"{API}/admin/status", timeout=10)
    ok = r.status_code == 401
    record("GET /api/admin/status (no auth → 401)", ok, f"status={r.status_code}")


def test_set_current_both_auths(token: str):
    # Pick a race
    r = requests.get(f"{API}/races?limit=5", timeout=15)
    if r.status_code != 200:
        record("GET /api/races (precondition)", False, f"status={r.status_code}")
        return
    races = (r.json() or {}).get("races", [])
    if not races:
        record("Set-current precondition", False, "no races available")
        return
    race_id = races[0]["race_id"]

    # 1. Set-current with Bearer JWT
    r1 = requests.post(
        f"{API}/admin/races/{race_id}/set-current",
        headers={"Authorization": f"Bearer {token}"},
        timeout=15,
    )
    ok1 = r1.status_code == 200 and (r1.json() or {}).get("ok") is True
    record("POST /api/admin/races/{id}/set-current (Bearer JWT)", ok1, f"status={r1.status_code} race_id={race_id}")

    # Verify is_current applied
    r2 = requests.get(f"{API}/races?limit=50", timeout=15)
    races2 = (r2.json() or {}).get("races", [])
    target = next((x for x in races2 if x["race_id"] == race_id), None)
    ok2 = target is not None and target.get("is_current") is True
    record("Verify is_current via /api/races after JWT set-current", ok2, f"target={target}")

    # 2. Set-current with legacy passcode (same race; should also succeed/idempotent)
    r3 = requests.post(
        f"{API}/admin/races/{race_id}/set-current",
        headers={"X-Admin-Passcode": LEGACY_PASSCODE},
        timeout=15,
    )
    ok3 = r3.status_code == 200 and (r3.json() or {}).get("ok") is True
    record("POST /api/admin/races/{id}/set-current (legacy passcode)", ok3, f"status={r3.status_code}")

    # 3. Without auth → 401
    r4 = requests.post(f"{API}/admin/races/{race_id}/set-current", timeout=10)
    ok4 = r4.status_code == 401
    record("POST /api/admin/races/{id}/set-current (no auth → 401)", ok4, f"status={r4.status_code}")


def test_delete_auth_gating():
    # No auth → 401 (use a non-existent race id, but auth check happens first)
    fake_id = "nonexistent-race-id-zzz-9999"
    r1 = requests.delete(f"{API}/admin/races/{fake_id}", timeout=10)
    ok1 = r1.status_code == 401
    record("DELETE /api/admin/races/{id} (no auth → 401)", ok1, f"status={r1.status_code}")


def test_delete_nonexistent_with_jwt(token: str):
    fake_id = "nonexistent-race-id-zzz-9999"
    r = requests.delete(
        f"{API}/admin/races/{fake_id}",
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    ok = r.status_code == 404
    record("DELETE /api/admin/races/{nonexistent} with JWT → 404", ok, f"status={r.status_code}")


def test_upload_auth_gating():
    # No auth → 401 (don't actually send a file; auth is checked before file processing)
    # We do need to send something for FastAPI to reach the endpoint with file=File(...).
    # Without a file FastAPI returns 422 BEFORE auth check (validation error). To test auth gating,
    # send an empty multipart so FastAPI passes validation, then auth fires.
    # But File(...) is required: missing file → 422. So we send a fake empty file.
    files = {"file": ("dummy.pdf", b"", "application/pdf")}
    r = requests.post(f"{API}/admin/races/upload", files=files, timeout=15)
    ok = r.status_code == 401
    record("POST /api/admin/races/upload (no auth → 401)", ok, f"status={r.status_code}")


def main():
    print(f"Testing against: {API}")

    token = test_login_valid()
    test_login_invalid_email()
    test_login_invalid_password()
    test_login_missing_fields()

    if not token:
        print("\nFATAL: could not obtain token, aborting auth-dependent tests")
        _summary()
        sys.exit(1)

    test_me_valid(token)
    test_me_no_header()
    test_me_bad_token()

    test_change_password_short_new(token)
    test_change_password_wrong_old(token)
    test_change_password_roundtrip(token)

    test_admin_status_with_jwt(token)
    test_admin_status_with_legacy()
    test_admin_status_no_auth()

    test_set_current_both_auths(token)
    test_delete_auth_gating()
    test_delete_nonexistent_with_jwt(token)
    test_upload_auth_gating()

    _summary()


def _summary():
    passed = sum(1 for _, ok, _ in results if ok)
    failed = [r for r in results if not r[1]]
    print("\n" + "=" * 70)
    print(f"PASSED: {passed}/{len(results)}")
    if failed:
        print(f"FAILED: {len(failed)}")
        for name, _, details in failed:
            print(f"  - {name} :: {details}")
    print("=" * 70)


if __name__ == "__main__":
    main()
