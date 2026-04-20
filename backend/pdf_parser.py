"""PDF → structured race JSON via Claude Sonnet 4.5 (Emergent LLM Key)."""
import json
import os
import re
from typing import Any, Dict

import pdfplumber
from emergentintegrations.llm.chat import LlmChat, UserMessage

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

EXTRACT_SYSTEM_PROMPT = """Tu es un expert en extraction de données depuis des publications françaises de courses hippiques (PMU'B / Le Journal Hippique).

Tu reçois le texte brut d'un PDF d'une course. Tu dois retourner un UNIQUEMENT objet JSON strict (sans markdown, sans texte avant/après) respectant EXACTEMENT ce schéma :

{
  "race": {
    "name": "string (ex: 'Prix du Pavillon Royal')",
    "event_type": "string (ex: '4+1 du Dimanche' ou '5+1 du Samedi')",
    "date_text": "string (ex: 'Dimanche 12 Avril 2026')",
    "date_iso": "YYYY-MM-DD",
    "location": "string (ex: 'ParisLongchamp')",
    "discipline": "Plat | Obstacles | Trot | Haies | Steeple",
    "distance_m": int,
    "runners": int,
    "prize_euros": int,
    "prize_fcfa": int
  },
  "horses": [
    {
      "number": int,
      "name": "string (majuscules)",
      "jockey": "string",
      "trainer": "string",
      "owner": "string",
      "weight": "string (ex: '60 kg' ou '58,5 kg')",
      "age": int,
      "sex": "M | F | H",
      "perf": "string (ex: '4.9.1.1.0')",
      "gains_fcfa": int,
      "commentary": "string (texte narratif court sur la forme du cheval)"
    }
  ],
  "predictions": [
    { "source": "string (ex: 'ParisTurf')", "picks": [int, ...] }
  ],
  "classifications": {
    "Forme": [int, ...],
    "Classe": [int, ...],
    "Progrès": [int, ...],
    "Régularité": [int, ...]
  },
  "previous_results": {
    "date": "string",
    "race_name": "string",
    "finishing_order": [int, ...],
    "npo": [int, ...],
    "fallers_dq": [int, ...],
    "payouts": [
      { "type": "string (ex: 'Ordre', 'Désordre', 'Bonus', 'Couplé Gagnant')", "amount_fcfa": int, "label": "string" }
    ]
  }
}

Règles strictes :
- Retourne UNIQUEMENT le JSON, sans ```json``` ni texte.
- Si une donnée n'est pas dans le PDF, utilise 0 pour les int, "" pour les string, [] pour les listes.
- Le nombre de chevaux doit correspondre à 'runners'.
- Les 'picks' et 'classifications' ne contiennent QUE des numéros de cheval présents dans horses.
- Convertis les poids (ex: '60.KG' → '60 kg', '58,5.KG' → '58,5 kg').
- Nettoie les noms (pas de points superflus : 'A.POUCHIN' → 'A. Pouchin').
- date_iso au format ISO strict YYYY-MM-DD.
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
    """Parse a PDF to structured race data using Claude Sonnet 4.5."""
    api_key = os.environ.get("EMERGENT_LLM_KEY", "")
    if not api_key:
        raise ValueError("EMERGENT_LLM_KEY non configurée côté serveur.")

    raw_text = extract_pdf_text(pdf_bytes)
    if not raw_text.strip():
        raise ValueError("Le PDF ne contient pas de texte extractible.")

    # Truncate extremely long PDFs to stay within token limits
    if len(raw_text) > 40000:
        raw_text = raw_text[:40000]

    chat = LlmChat(
        api_key=api_key,
        session_id=session_id,
        system_message=EXTRACT_SYSTEM_PROMPT,
    ).with_model("gemini", "gemini-2.5-flash")

    msg = UserMessage(text=f"Voici le texte du PDF à parser :\n\n{raw_text}")
    response = await chat.send_message(msg)
    cleaned = _strip_fences(str(response))

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as e:
        # Try to extract first {...} block
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if not match:
            raise ValueError(f"Réponse LLM non JSON: {cleaned[:500]}") from e
        data = json.loads(match.group(0))

    return data
