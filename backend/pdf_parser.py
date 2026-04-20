"""PDF → structured race JSON via Claude Sonnet 4.5 (Emergent LLM Key)."""
import json
import os
import re
from typing import Any, Dict

import pdfplumber
from emergentintegrations.llm.chat import LlmChat, UserMessage

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

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
      "commentary": "string"
    }
  ],
  "predictions": [
    { "source": "string", "picks": [int, ...] }
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
      { "type": "string (ex: 'Ordre', 'Désordre', 'Bonus', 'Couplé Gagnant', 'Couplé Placé 4-14', 'Tiercé', 'Quarté+')", "amount_fcfa": int, "label": "string (ex: '75 gagnants' ou 'par mise')" }
    ]
  }
}

Règles strictes :
- Retourne UNIQUEMENT le JSON, sans ```json``` ni texte.
- Pour un PDF DE TYPE RÉSULTATS : laisse "horses": [], "predictions": [], "classifications": {}, et remplis "previous_results" avec l'ordre d'arrivée officiel et tous les rapports (chaque couplé placé est un payout séparé). Le champ "race.name" prend le nom du pari (ex: 'QUARTE DU LUNDI').
- Pour un PDF DE TYPE PROGRAMME : remplis tout. "previous_results" contient les résultats de la course précédente mentionnée.
- Si une donnée manque, utilise 0 pour les int, "" pour les string, [] pour les listes.
- Les "picks" et "classifications" ne contiennent QUE des numéros de cheval présents dans horses.
- Nettoie les poids ('60.KG' → '60 kg') et les noms ('A.POUCHIN' → 'A. Pouchin').
- date_iso au format YYYY-MM-DD. Si le PDF a '20/04/2026' → '2026-04-20'.
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
