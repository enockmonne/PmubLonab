# Launch Readiness

## Staging Must Be Stable

- Programme upload works.
- Results upload/display works.
- Results embedded in course PDFs display correctly.
- Current race flow works.
- Admin can recover from bad upload by deleting/reuploading.
- App loads acceptably on repeat opens.

## Data Quality

- Recent PDFs have been tested.
- Horse completeness is acceptable.
- Predictions and classifications are acceptable.
- Previous results/reports are acceptable.
- Betting footer is acceptable.
- Known parser limitations are documented.

## Admin Readiness

- Admin login/password flow is ready.
- Production admin credentials are set.
- Admin correction needs are understood.
- Admin users know how to upload, set current, delete, and validate.

## Production Infrastructure

- Production API deployed.
- Production web app deployed.
- Production admin deployed.
- Production MongoDB created.
- Secrets configured.
- CORS configured.
- Backups configured.
- Monitoring/log access confirmed.

## Mobile / Push

- Physical Android push test completed.
- Expo/EAS project configured.
- Notification topics reviewed.
- Notification copy reviewed.

## Product

- No direct betting guarantees.
- Mostly French copy.
- Main flows are not too busy.
- Race Intelligence roadmap is defined.
- Premium plan is not blocking launch.

## Go / No-Go

Launch only when:

- staging QA checklist passes
- production secrets are configured
- admin access is secure
- upload/display workflow is reliable enough for first users
- rollback/redeploy process is understood
