# PMU'B/LONAB/Analysis Plan

## Purpose

PMU'B/LONAB/Analysis is a separate research-oriented application branched from the current PMU'B/LONAB app.

The current app remains focused on viewing programmes, partants, pronostics, results, and archives. The new app will use the same PDF raw data as its primary source, but the product focus is search, research, historical analysis, and structured intelligence.

This product is for bettors who want more information and context. It should not present direct betting recommendations.

## Confirmed Decisions

- Start from the current PmubLonab repository.
- Create a new branch first; eventually split into a separate repository if the product diverges enough.
- Product name for now: `PMU'B/LONAB/Analysis`.
- Start with the same design system and gradually reshape tabs/screens.
- Keep French-first UX.
- Keep Gemini PDF parsing for now.
- Add provider fallback later if Gemini reliability or OCR quality becomes a blocker.
- Use a completely separate MongoDB database/cluster from the current app.
- Share the same admin login foundation for now.
- Add an admin product-selection screen after login so the admin chooses:
  - `PMU'B/LONAB`
  - `PMU'B/LONAB/Analysis`
- The new app should eventually ingest all historical PDFs from LONAB.
- Current documents and architecture are the starting point and should be edited as the product changes.

## Branch And Folder

Initial branch:

```bash
codex/pmub-lonab-analysis
```

Initial worktree folder:

```text
C:\Users\alion\Documents\Codex\2026-07-07\pmub-lonab-analysis
```

## Product Direction

The application should make raw racing PDFs more useful by turning them into searchable, comparable, and explainable research data.

Core user questions:

- What has this horse done historically?
- How has this horse performed by distance, track, race type, or discipline?
- Which jockeys/trainers are consistently appearing in strong results?
- Which media/pronostic sources have historically performed better?
- How do odds, media picks, and actual results compare over time?
- What similar historical races exist for a given race profile?
- What useful context exists before reading the raw programme?

## Initial UX Direction

Start from the existing app design, but gradually move toward research workflows.

Possible future tabs:

- `Recherche`
- `Chevaux`
- `Courses`
- `Sources`
- `Analyses`

Early phase can keep current screens until the new research screens are ready.

## Data Strategy

Primary source:

- programme PDFs
- result/report PDFs
- historical PDF archives

Use a separate MongoDB Atlas database or cluster. Do not point this app at the current staging/prod database.

Reuse existing race documents first:

- race metadata
- horses
- predictions
- odds
- weekly best
- classifications
- previous results
- linked result/programme relationships

Add analysis-oriented indexes later:

- horse name
- jockey
- trainer
- owner
- date
- location/hippodrome
- discipline
- race type
- distance
- source/media name
- linked results

## Admin Strategy

Short term:

- reuse existing admin login/auth system
- keep current PDF upload/import capability
- add an admin landing screen after login to choose the product area
- route current app admin features to the existing admin section
- route analysis app admin features to a new analysis section

Analysis admin needs:

- upload old/new PDFs
- import LONAB PDFs
- see parse status
- see duplicate/skipped imports
- see extraction quality
- review missing fields
- rerun parsing later if provider fallback is added

## Environment Strategy

Create separate environments for the analysis app.

Backend:

```env
APP_PRODUCT=analysis
MONGO_URL=<analysis mongo url>
DB_NAME=pmublonab_analysis
GEMINI_API_KEY=<analysis/staging key>
GEMINI_MODEL=gemini-2.5-flash
JWT_SECRET=<separate secret>
ADMIN_BOOTSTRAP_EMAIL=<same or separate admin email>
ADMIN_BOOTSTRAP_PASSWORD=<secure password>
CORS_ORIGINS=<analysis frontend/admin URLs>
```

Frontend:

```env
EXPO_PUBLIC_APP_ENV=analysis-staging
EXPO_PUBLIC_BACKEND_URL=<analysis api url>
EXPO_PUBLIC_ADMIN_WEB_URL=<analysis admin url>
```

Admin:

```env
VITE_API_URL=<analysis api url>
```

Do not copy production secrets into the repo.

## Implementation Phases

### Phase 1: Branch, Docs, Product Framing

- Create branch/worktree.
- Add this plan.
- Add new handoff prompt.
- Decide first screen/tabs for the analysis product.
- Decide if the branch should be deployed to separate Render services immediately or after first UI changes.

### Phase 2: Environment Separation

- Add analysis env examples.
- Add `APP_PRODUCT` or equivalent product flag.
- Add explicit database naming support if needed.
- Prepare separate MongoDB Atlas database/cluster.
- Prepare separate Render services:
  - analysis API
  - analysis web
  - analysis admin

### Phase 3: Admin Product Selection

- Keep shared admin login.
- After successful login, show product selector:
  - `PMU'B/LONAB`
  - `PMU'B/LONAB/Analysis`
- Add analysis admin route group.
- Keep upload/import available in the analysis area.

### Phase 4: Analysis-Oriented Frontend

- Keep current design system.
- Replace tab structure gradually with research tabs.
- Start with:
  - search/research landing
  - horse intelligence profile
  - source/media performance
  - historical race explorer
  - analysis summaries

### Phase 5: Historical Ingest

- Build bulk import flow for historical LONAB PDFs.
- Add dedupe controls.
- Track parse success/failure.
- Add data quality screen.
- Prioritize historical PDFs by date range and file type.

### Phase 6: Intelligence Features

Start with deterministic/statistical insights:

- horse historical profile
- performance by distance/type/track
- jockey/trainer recurring performance
- media/pronostic source accuracy
- odds vs result comparison
- similar race lookup

Then add AI-assisted summaries:

- PDF-grounded race summaries
- horse research notes
- source divergence explanation
- "what changed since last appearance" analysis

Every AI summary should cite or derive from stored raw PDF data and avoid direct betting advice.

## Open Questions

- Should the analysis app have a completely separate brand visual later?
- Should analysis access be premium-only from the beginning?
- Should the analysis database retain original PDF files or only parsed structured data?
- Which historical PDF range should be ingested first?
- Should historical import run manually from admin or as scheduled jobs?
- Should user-facing search include fuzzy matching for accents/spelling variants?
- Should the first public release be web/PWA only, or also Expo/native later?

## Immediate Next Actions

1. Push the new branch.
2. Start a new Codex chat using `PMUB_LONAB_ANALYSIS_HANDOFF.md`.
3. In the new chat, inspect the worktree and confirm the branch.
4. Add analysis env examples and product naming.
5. Design the first analysis tab structure.
6. Plan separate MongoDB Atlas setup.
7. Decide whether to create separate Render services now or after the first UI split.
