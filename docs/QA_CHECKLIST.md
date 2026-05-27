# QA Checklist

Use this after each staging deploy.

## Environment

- API loads.
- Web app loads.
- Admin web loads.
- Correct staging environment variables are active.
- Render deploy finished successfully.

## Programme Upload

- Upload a valid programme PDF.
- Upload result appears in admin.
- Race appears in app.
- Upload summary is understandable.
- Gemini/API parsing errors are clear when they happen.

## Horse Completeness

- Runner count matches PDF.
- All horse numbers appear.
- Horse names match PDF.
- Jockeys match where present.
- Trainers match where present.
- Owners match where present.
- Weights, age, sex, performance, and gains are captured where present.
- Horse history appears when present.

## Pronostics

- Prediction sources appear.
- Picks match PDF.
- Consensus appears.
- Classifications appear.
- No fake data appears when source data is missing.

## Results / Reports

- Resultats page shows result-only PDFs.
- Resultats page shows results embedded in course PDFs.
- "Voir tous les rapports" opens result-focused detail.
- Back label says "Resultats" in results flow.
- Top 3 Consensus and Partants are hidden in results flow.
- Finishing order matches PDF.
- Payout amounts match PDF.
- Coupled/place payout rows are separated.

## Betting Footer

- "Arret des jeux" appears on every programme.
- Weekday/weekend/night times are correct.
- Official note is correct when present.

## Performance

- First open may cold start staging API.
- Second open should show cached Programmes/Resultats data quickly.
- Pull-to-refresh still updates data.

## Admin

- Login works.
- Set current works.
- Delete works.
- Races list badges are understandable.
- Logs record important admin actions.

## Mobile Layout

- Main tabs fit.
- Programme screen scrolls cleanly.
- Result cards fit.
- Race detail text does not overlap.
- Buttons are tappable.
