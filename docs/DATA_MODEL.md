# Data Model

## Races Collection

Primary collection for programme and result documents.

Important fields:

- `race_id`: stable public identifier.
- `doc_type`: `programme` or `result`.
- `name`
- `event_type`
- `date_text`
- `date_iso`
- `location`
- `discipline`
- `distance_m`
- `runners`
- `prize_euros`
- `prize_fcfa`
- `hero_image`
- `editorial_synthesis`
- `horses`
- `predictions`
- `classifications`
- `classement`
- `betting`
- `previous_results`
- `is_current`
- `created_at`

## Horse Shape

Fields commonly extracted:

- `number`
- `name`
- `jockey`
- `trainer`
- `owner`
- `weight`
- `age`
- `sex`
- `perf`
- `gains_fcfa`
- `commentary`
- `history`

## Previous Results Shape

Stored under `previous_results`:

- `date`
- `race_name`
- `finishing_order`
- `npo`
- `fallers_dq`
- `payouts`
- optional `stats`

Payout shape:

- `type`
- `amount_fcfa`
- `label`

## Betting Shape

Stored under `betting`:

- `arret_jeux_weekday`
- `arret_jeux_weekend`
- `arret_jeux_nocturne`
- `daylight_saving_note`
- `customer_service`

## Needed Data Model Improvements

- Add `source_pdf` metadata:
  - original filename
  - file hash
  - upload time
  - parser version
- Add `parse_quality`:
  - expected runners
  - horses parsed
  - predictions found
  - previous results found
  - betting info found
  - warnings
- Add result/programme linking:
  - `programme_race_id`
  - `result_race_id`
  - confidence score
- Add historical analytics collections or precomputed documents.
