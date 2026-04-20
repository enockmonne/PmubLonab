# PRD — Le Journal Hippique PMU'B (Mobile App)

## Overview
Premium editorial-style mobile web app (React Native / Expo Router) that digitizes a French horse-racing publication ("Le Journal Hippique — PMU'B"). Based on the attached PDF for the **Prix du Pavillon Royal** (Sunday 12 April 2026, ParisLongchamp, 2400m, 16 runners, 50 900 € / 33 500 000 F CFA).

## Users
French-speaking horse racing bettors & enthusiasts (France + West Africa, hence F CFA currency).

## Core Features
1. **Course (Home tab)** — Masthead, hero image, race stats grid (discipline, distance, runners, allocation EUR + F CFA), computed consensus top-3, betting stop times + daylight saving note.
2. **Partants tab** — Searchable / sortable list of the 16 runners (by N°, consensus score, or gains). Each row: number, name, jockey, trainer, weight, age/sex, perf string, consensus score.
3. **Horse detail screen** — Full profile: jockey/trainer/owner grid, perf string, gains (F CFA), consensus score with bar, mentions per media outlet with rank, editorial classifications tags (Forme/Classe/Progrès/Régularité), full commentary.
4. **Pronostics tab** — 3 views (tabs): Consensus ranking with progress bars; per-expert media bases (7 outlets); classifications (Forme, Classe, Progrès, Régularité).
5. **Résultats tab** — Previous race results (Prix de la Gloriette — 08/04/2026): finishing order podium, NPO & tombés, full payouts table (Ordre, Désordre, Bonus, Couplé) in F CFA.

## Design
Archetype: Swiss & High-Contrast + Editorial Old Money Tech. Racing green `#0A2E1A`, gold `#B08D57`, cream `#FAF9F6`. Playfair-style headlines, IBM Plex body, flat bordered cards, no shadows, generous whitespace.

## Backend (FastAPI)
- `GET /api/race` — race info + betting + computed top 3 consensus
- `GET /api/horses` — all 16 horses enriched with consensus score & appearances
- `GET /api/horses/{n}` — full horse detail with expert mentions and classifications
- `GET /api/predictions` — 7 expert lists + consensus + classifications
- `GET /api/results` — previous race payouts in F CFA
- `POST/GET/DELETE /api/favorites` — MongoDB-backed per-device favorites

## Smart Business Enhancement
Computed **consensus score** (weighted points across 7 media outlets) turns raw expert picks into a single actionable ranking — the app's unique editorial value-add that dramatically increases perceived expertise and daily re-engagement vs generic tipster feeds.
