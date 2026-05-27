# Deployment

## Current Staging

Render services:

- API: https://pmublonab-staging-api.onrender.com
- Web app: https://pmublonab-staging-web.onrender.com
- Admin web: https://pmublonab-staging-admin.onrender.com

Database:

- MongoDB Atlas staging DB.

## Deploy Flow

1. Merge PR into `main`.
2. GitHub Actions CI runs.
3. Render auto-deploys connected services from `main`.
4. Confirm deploy logs.
5. Test staging URLs.

## Backend Requirements

Required environment variables:

- `MONGO_URL`
- `DB_NAME`
- `JWT_SECRET`
- `GEMINI_API_KEY`
- `ADMIN_EMAIL`
- `ADMIN_INITIAL_PASSWORD`
- `CORS_ORIGINS`

Optional:

- `GEMINI_MODEL`
- `GEMINI_TIMEOUT_SECONDS`
- `PORT`

## Frontend Requirements

- `EXPO_PUBLIC_BACKEND_URL`
- `EXPO_PUBLIC_ADMIN_WEB_URL`
- `EXPO_PUBLIC_APP_ENV`
- `EXPO_PUBLIC_EAS_PROJECT_ID`

## Admin Web Requirements

- `VITE_API_BASE_URL`
- `VITE_APP_ENV`

## Production Readiness

Before production:

- Create production MongoDB.
- Configure production secrets.
- Configure production CORS.
- Decide Render/Fly/Railway/VPS/AWS/Azure.
- Decide domain names.
- Decide backup policy.
- Test push notifications on physical Android.
- Confirm admin access model.
- Run full QA checklist.

## Operational Notes

- Render cold starts can slow first request on lower-cost instances.
- Consider paid always-on instance or keep-warm monitoring before broader public testing.
- Never commit real secrets.
