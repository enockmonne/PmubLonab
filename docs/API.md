# API Reference

Base path: `/api`.

## Public App

- `GET /race`: current race summary for legacy/current app flow.
- `GET /races`: race library summaries.
- `GET /races/current`: full current race.
- `GET /races/{race_id}`: full race by id.
- `GET /horses`: current race horses.
- `GET /horses/{horse_number}`: current race horse detail.
- `GET /predictions`: current race predictions, consensus, classifications.
- `GET /results`: current race previous results.
- `GET /search?q=...`: race/horse/jockey/trainer search.

## Stats

- `GET /stats/horses/{name}`: historical horse appearances and rates.
- `GET /stats/horses/leaderboard`: top horses by win/top-3 rate.
- `GET /stats/tipsters`: prediction source accuracy.
- `GET /stats/people`: jockey and trainer leaderboards.

## Admin

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/change-password`
- `GET /admin/status`
- `POST /admin/races/upload`
- `POST /admin/races/{race_id}/set-current`
- `DELETE /admin/races/{race_id}`
- `GET /admin/logs`
- `GET /admin/announcements`
- `POST /admin/announcements`
- `DELETE /admin/announcements/{id}`

## LONAB Import

- `POST /admin/imports/lonab/preview`
  - Discovers PDF links from LONAB archive/list pages.
- `POST /admin/imports/lonab/import`
  - Imports selected LONAB PDF URLs.
  - Max 5 PDFs per request.
  - Accepts only LONAB PDF URLs.
  - Computes file hash and skips duplicate imports.

