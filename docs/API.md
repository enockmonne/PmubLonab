# API

Base path: `/api`

## Public Endpoints

### `GET /api/`

Health/basic API message.

### `GET /api/race`

Legacy current race shape used by older app flows.

### `GET /api/races`

Lists races.

Query params:

- `q`
- `location`
- `doc_type`: `programme` or `result`
- `has_results`: boolean
- `limit`
- `skip`

### `GET /api/races/current`

Returns the current full race document.

### `GET /api/races/{race_id}`

Returns one full race document.

### `GET /api/horses`

Returns horses for the current race.

### `GET /api/horses/{number}`

Returns one horse from the current race.

### `GET /api/predictions`

Returns predictions, consensus, classifications, and classement for the current race.

### `GET /api/results`

Legacy endpoint returning previous results for the current race.

### `GET /api/search`

Searches races, horses, jockeys, and trainers.

### `GET /api/stats/horses/{name}`

Returns historical appearances and stats for a horse name.

### `GET /api/stats/tipsters`

Returns prediction-source leaderboard.

### `GET /api/stats/people`

Returns jockey and trainer leaderboard.

## Admin Endpoints

### `POST /api/auth/login`

Admin login.

### `GET /api/auth/me`

Returns current admin.

### `POST /api/auth/change-password`

Changes admin password.

### `POST /api/admin/races/upload`

Uploads a PDF for parsing.

### `POST /api/admin/races/{race_id}/set-current`

Sets the active/current race.

### `DELETE /api/admin/races/{race_id}`

Deletes a race.

### `GET /api/admin/status`

Admin dashboard status.

### `GET /api/admin/logs`

Admin activity logs.

## Push Endpoints

### `POST /api/push/register`

Registers an Expo push token.

### `POST /api/push/preferences`

Updates push preferences.

### `POST /api/admin/notifications/send`

Admin sends a push notification.

## Needed API Improvements

- `GET /api/app/bootstrap`
- Admin edit endpoints for race metadata, betting, and previous results.
- Upload parse-quality response shape.
- Result/programme linking endpoints.
- Deduplication warnings on upload.
