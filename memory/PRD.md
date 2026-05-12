# PRD — Le Journal Hippique PMU'B (Mobile App, multi-course)

## Overview
Application mobile éditoriale premium (React Native / Expo Router) digitalisant la publication française "Le Journal Hippique — PMU'B". Support **multi-courses** avec import PDF automatisé par LLM.

## Features

## Structure de navigation

**Landing page `/`** (nouvel accueil) — 2 grandes cartes :
- 🏇 **Programmes** → courses à venir (course du jour, partants, pronostics)
- 🏆 **Résultats** → courses passées avec résultats confirmés
+ 2 boutons secondaires : Recherche globale, Espace admin

**Tabs (après la landing, groupe `(tabs)/`)** :
1. Programme (course du jour)
2. Partants
3. Pronos (consensus, médias, classifications)
4. Résultats (liste filtrée — uniquement courses avec résultats confirmés + recherche)
5. Stats (leaderboard pronostiqueurs)

**Écrans hors tabs** : `/admin`, `/horse/[n]`, `/race/[id]`, `/horse-history/[name]`.

### Admin (/admin)
- Authentification par passcode (header `X-Admin-Passcode`, env `ADMIN_PASSCODE`, défaut : `pmub-admin-2026`).
- **Upload PDF** via `expo-document-picker` → parsing auto (LLM) → insertion MongoDB.
- Liste des courses : bouton ★ pour définir "course du jour", 🗑 pour supprimer.

## Backend (FastAPI + MongoDB)

### Collections
- `races` : un document par course (champs : `race_id`, `name`, `date_iso`, `location`, `horses[]`, `predictions[]`, `classifications{}`, `previous_results{}`, `is_current`).
- `favorites` : per-device.

### Endpoints
- **Legacy (current race)** : `/api/race`, `/api/horses`, `/api/horses/{n}`, `/api/predictions`, `/api/results`.
- **Multi-course** : `GET /api/races` (filtres `q`, `location`, pagination), `GET /api/races/{id}`, `GET /api/races/current`.
- **Stats** : `GET /api/stats/horses/{name}` (cross-course win/place rates), `GET /api/stats/tipsters` (leaderboard médias).
- **Search** : `GET /api/search?q=...` (courses, chevaux, jockeys, entraîneurs).
- **Admin** : `POST /api/admin/verify`, `POST /api/admin/races/upload` (multipart PDF), `POST /api/admin/races/{id}/set-current`, `DELETE /api/admin/races/{id}`.

### PDF Parser (`pdf_parser.py`)
- `pdfplumber` extrait le texte.
- **Gemini 2.5 Flash** via `GEMINI_API_KEY` extrait un JSON strict selon un schéma défini (race, horses[16], predictions[], classifications{}, previous_results{}).
- Robuste aux variations de mise en page — l'LLM s'adapte.

## Design (inchangé)
Swiss & High-Contrast + Editorial Old Money Tech : vert `#0A2E1A`, or `#B08D57`, crème `#FAF9F6`, bordures nettes, pas d'ombres, typographie Playfair/IBM Plex.

## Smart Business Enhancement
1. **Score consensus pondéré** (inchangé).
2. **Leaderboard pronostiqueurs** — transforme l'app en outil d'audit éditorial : quel média mérite la confiance ? Crée un hook viral et un axe de monétisation premium (accès aux médias les plus fiables).
3. **Historique cheval cross-course** — taux victoire/place auto-calculé dès 2 courses de données, boost de ré-engagement à chaque nouveau PDF importé.

## Tests
- 26 pytest backend passés (multi-race, search, stats, admin auth).
- Tests frontend des 5 onglets non rejoués (fonctionnent d'après screenshots).

## Notes
- ⚠️ Le parsing PDF nécessite une clé Gemini valide côté backend (`GEMINI_API_KEY`). Le reste de l'app fonctionne sans la clé.
