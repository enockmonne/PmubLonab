"""PDF -> structured race JSON via direct Gemini API."""
import asyncio
import json
import os
import re
import time
from typing import Any, Dict

import pdfplumber
import requests

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_TIMEOUT_SECONDS = int(os.environ.get("GEMINI_TIMEOUT_SECONDS", "180"))
GEMINI_MAX_RETRIES = int(os.environ.get("GEMINI_MAX_RETRIES", "2"))
GEMINI_RETRY_BACKOFF_SECONDS = float(os.environ.get("GEMINI_RETRY_BACKOFF_SECONDS", "4"))
GEMINI_RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}

EXTRACT_SYSTEM_PROMPT = """Tu es un expert en extraction de données depuis des publications françaises de courses hippiques (PMU'B / Le Journal Hippique).

Tu reçois le texte brut d'un PDF qui peut être DE DEUX TYPES :
1. PROGRAMME : présente une course à venir avec tous les partants, pronostics de médias, et éventuellement les résultats d'une course précédente.
2. RÉSULTATS : présente uniquement les résultats officiels d'une course (ordre d'arrivée + rapports Ordre/Désordre/Bonus/Couplé/Tiercé/Quarté+/Quinté+).

Dans les DEUX cas, tu dois retourner UN SEUL objet JSON strict (sans markdown, sans texte avant/après) avec ce schéma :

{
  "race": {
    "name": "string (ex: 'Prix du Pavillon Royal' ou 'QUARTE DU LUNDI')",
    "event_type": "string (ex: '4+1 du Dimanche', 'QUARTE+', 'TIERCE', 'QUINTE+')",
    "date_text": "string (ex: 'Lundi 20 Avril 2026' ou '20/04/2026')",
    "date_iso": "YYYY-MM-DD",
    "location": "string (ex: 'ParisLongchamp', 'Lonab', 'Vincennes')",
    "discipline": "Plat | Obstacles | Trot | Haies | Steeple | \"\" si inconnu",
    "distance_m": int (0 si inconnu),
    "runners": int (0 si inconnu),
    "prize_euros": int (0 si inconnu),
    "prize_fcfa": int (0 si inconnu)
  },
  "editorial_synthesis": "string — paragraphe narratif éditorial de synthèse de la course, écrit par la rédaction, qui discute les chevaux favoris et leurs chances. Extrait tel quel depuis le PDF (plusieurs phrases, mention des numéros de cheval entre parenthèses). Laisse \"\" si absent.",
  "horses": [
    {
      "number": int,
      "name": "string",
      "jockey": "string",
      "trainer": "string",
      "owner": "string",
      "weight": "string",
      "age": int,
      "sex": "M | F | H",
      "perf": "string",
      "gains_fcfa": int,
      "commentary": "string",
      "history": [
        { "date": "string (DD/MM/YY ou YYYY-MM-DD)", "location": "string (hippodrome)", "position": int (place d'arrivée 1-99, 0 si non placé), "distance": "string (ex: '2400m')", "jockey": "string", "discipline": "string (Plat/Trot/Obstacle)" }
      ]
    }
  ],
  "predictions": [
    { "source": "string", "picks": [int, ...] }
  ],
  "classifications": {
    "Forme": [int, ...],
    "Classe": [int, ...],
    "Progrès": [int, ...],
    "Régularité": [int, ...],
    "Entraîneurs en forme": [ { "name": "string", "stat": "string (ex: '12 vict. / 60 part. (20%)' ou laissé vide si absent)" }, ... ],
    "Jockeys en forme": [ { "name": "string", "stat": "string (ex: '8 vict. / 40 mtes (20%)' ou laissé vide si absent)" }, ... ],
    "Favoris": [int, ...]
  },
  "classement": {
    "Secondes chances": [int, ...],
    "Outsiders": [int, ...],
    "Gros outsiders": [int, ...]
  },
  "betting": {
    "arret_jeux_weekday": "string (ex: '11h 45mn', laisse '' si absent)",
    "arret_jeux_weekend": "string (ex: '13h 05mn', laisse '' si absent)",
    "arret_jeux_nocturne": "string (ex: '18h 05mn', laisse '' si absent)",
    "daylight_saving_note": "string (note officielle sur le changement d'heure ou les horaires d'arret des jeux, laisse '' si absent)",
    "customer_service": "string (telephone/service client si present, laisse '' si absent)"
  },
  "previous_results": {
    "date": "string",
    "race_name": "string",
    "finishing_order": [int, ...],
    "npo": [int, ...],
    "fallers_dq": [int, ...],
    "payouts": [
      { "type": "string (ex: 'Ordre', 'Désordre', 'Bonus', 'Couplé Gagnant', 'Couplé Placé 4-14', 'Tiercé', 'Quarté+')", "amount_fcfa": int, "label": "string (ex: '75 gagnants' ou 'par mise')" }
    ]
  }
}

Règles strictes :
- Retourne UNIQUEMENT le JSON, sans ```json``` ni texte.
- Pour un PDF DE TYPE RÉSULTATS : laisse "horses": [], "predictions": [], "classifications": {}, et remplis "previous_results" avec l'ordre d'arrivée officiel et tous les rapports (chaque couplé placé est un payout séparé). Le champ "race.name" prend le nom du pari (ex: 'QUARTE DU LUNDI').
- Pour un PDF DE TYPE PROGRAMME : remplis tout. "previous_results" contient les résultats de la course précédente mentionnée.
- Si une donnée manque, utilise 0 pour les int, "" pour les string, [] pour les listes.
- Les "picks" et les classifications "Forme", "Classe", "Progrès", "Régularité", "Favoris" ne contiennent QUE des numéros de cheval présents dans horses (entiers).
- ATTENTION : "Entraîneurs en forme" et "Jockeys en forme" contiennent des OBJETS {"name": string, "stat": string}, PAS de numéros de chevaux. Extrait le nom tel qu'affiché dans la rubrique (ex. "A. Fabre") et les statistiques associées si présentes (ex. "12 vict. / 60 part. (20%)", ou "8 vict. / 40 mtes (20%)" pour les jockeys). Si aucune stat n'est disponible, mets "stat": "". Nettoie la casse des noms (ex. "A.FABRE" → "A. Fabre").
- IMPORTANT : pour chaque cheval, remplis "history" avec TOUTES les courses précédentes listées dans la rubrique du cheval (souvent un tableau ou liste de dates+positions+lieux). Inclus le maximum d'éléments (jusqu'à 10). Position = chiffre de l'arrivée (1 si gagnant, 2 si 2e, etc.). Met 0 si le cheval n'était pas placé. Si aucune course passée n'est listée, mets "history": [].
- Nettoie les poids ('60.KG' → '60 kg') et les noms ('A.POUCHIN' → 'A. Pouchin').
- date_iso au format YYYY-MM-DD. Si le PDF a '20/04/2026' → '2026-04-20'.
- IMPORTANT : extrais la section "Arret des jeux" / horaires PMU'B / note officielle de changement d'heure dans "betting". Si le PDF mentionne des jours ouvrables (lundi-vendredi), week-end (samedi/dimanche) ou course nocturne, remplis les champs correspondants. Ne copie pas d'horaires depuis un exemple si le PDF ne les contient pas.
- Pour les rapports F CFA : extrais les montants en entier (pas d'espaces). Exemple : '591 000' → 591000.
"""


def extract_pdf_text(pdf_bytes: bytes) -> str:
    """Extract plain text from PDF bytes."""
    import io
    text_parts = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            t = page.extract_text() or ""
            text_parts.append(t)
    return "\n\n".join(text_parts)


def _strip_fences(s: str) -> str:
    s = s.strip()
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*", "", s)
        s = re.sub(r"\s*```$", "", s)
    return s.strip()


async def parse_pdf_to_race(pdf_bytes: bytes, session_id: str) -> Dict[str, Any]:
    """Parse a PDF to structured race data using Gemini."""
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        raise ValueError("GEMINI_API_KEY non configuree cote serveur.")

    raw_text = extract_pdf_text(pdf_bytes)
    if not raw_text.strip():
        raise ValueError("Le PDF ne contient pas de texte extractible.")

    # Truncate extremely long PDFs to stay within token limits
    if len(raw_text) > 40000:
        raw_text = raw_text[:40000]

    response_text = await _send_gemini_prompt(
        api_key=api_key,
        model=os.environ.get("GEMINI_MODEL", GEMINI_MODEL),
        prompt=f"{EXTRACT_SYSTEM_PROMPT}\n\nVoici le texte du PDF a parser :\n\n{raw_text}",
    )

    cleaned = _strip_fences(response_text)

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as e:
        # Try to extract first {...} block
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if not match:
            raise ValueError(f"Réponse LLM non JSON: {cleaned[:500]}") from e
        data = json.loads(match.group(0))

    return data


async def check_llm_health() -> Dict[str, Any]:
    """Return a lightweight Gemini health status for the admin dashboard."""
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        return {"status": "error", "error": "GEMINI_API_KEY non configuree."}

    try:
        response_text = await _send_gemini_prompt(
            api_key=api_key,
            model=os.environ.get("GEMINI_MODEL", GEMINI_MODEL),
            prompt="Reponds uniquement avec: ok",
            timeout_seconds=30,
            response_mime_type="text/plain",
            max_retries=0,
        )
        return {"status": "ok" if response_text.strip() else "error", "error": None}
    except Exception as e:
        return {"status": "error", "error": str(e)[:200]}


async def _send_gemini_prompt(
    api_key: str,
    model: str,
    prompt: str,
    timeout_seconds: int = GEMINI_TIMEOUT_SECONDS,
    response_mime_type: str = "application/json",
    max_retries: int = GEMINI_MAX_RETRIES,
) -> str:
    return await asyncio.to_thread(
        _send_gemini_prompt_sync,
        api_key,
        model,
        prompt,
        timeout_seconds,
        response_mime_type,
        max_retries,
    )


def _send_gemini_prompt_sync(
    api_key: str,
    model: str,
    prompt: str,
    timeout_seconds: int,
    response_mime_type: str,
    max_retries: int,
) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}],
            }
        ],
        "generationConfig": {
            "temperature": 0,
            "responseMimeType": response_mime_type,
        },
    }
    attempts = max(1, max_retries + 1)
    last_error: Exception | None = None

    for attempt in range(attempts):
        try:
            response = requests.post(
                url,
                params={"key": api_key},
                json=payload,
                timeout=timeout_seconds,
            )
            if response.status_code >= 400:
                error = ValueError(f"Gemini API error {response.status_code}: {response.text[:500]}")
                if response.status_code not in GEMINI_RETRYABLE_STATUS_CODES or attempt == attempts - 1:
                    raise error
                last_error = error
            else:
                body = response.json()
                try:
                    return body["candidates"][0]["content"]["parts"][0]["text"]
                except (KeyError, IndexError, TypeError) as e:
                    raise ValueError(f"Gemini response missing text: {body}") from e
        except (requests.Timeout, requests.ConnectionError) as exc:
            if attempt == attempts - 1:
                raise
            last_error = exc

        time.sleep(GEMINI_RETRY_BACKOFF_SECONDS * (attempt + 1))

    raise ValueError(f"Gemini request failed after retries: {last_error}")
