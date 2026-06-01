# Data Model

## Race Document

Primary collection: `races`.

Core fields:

- `race_id`
- `doc_type`: `programme` or `result`
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
- `is_current`
- `created_at`

## Nested Fields

`horses`:

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

`predictions`:

- `source`
- `picks`

`previous_results`:

- `race_name`
- `date`
- `finishing_order`
- `payouts`
- `stats`

`betting`:

- `arret_jeux_weekday`
- `arret_jeux_weekend`
- `arret_jeux_nocturne`
- `daylight_saving_note`
- `customer_service`

`parse_quality`:

- `doc_type`
- `expected_runners`
- `horses_count`
- `predictions_count`
- `classifications_count`
- `has_predictions`
- `has_classifications`
- `has_previous_results`
- `has_betting_info`
- `warnings`

`import_source`:

- `provider`
- `pdf_url`
- `filename`
- `file_hash`
- `imported_at`

