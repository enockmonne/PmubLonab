# Deployment

## Staging

Current staging target:

- Backend API: Render web service.
- Web app: Render static site.
- Admin web: Render static site.
- Database: MongoDB Atlas staging cluster.

## Required Backend Environment

- `APP_ENV`
- `MONGO_URL`
- `DB_NAME`
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `CORS_ORIGINS`

## Required Frontend Environment

- `EXPO_PUBLIC_BACKEND_URL`
- `EXPO_PUBLIC_APP_ENV`
- Expo/EAS project id for push notifications when native testing is active.

## Release Flow

1. Merge PR into `main`.
2. Render redeploys services/sites.
3. Verify CI and Render deploy status.
4. Smoke-test staging.
5. Test admin workflows if backend/admin changed.

## Production Readiness Notes

- Use explicit production secrets.
- Confirm admin access model.
- Confirm database backup/restore plan.
- Confirm privacy/access controls before sharing widely.
- Test push notifications on physical Android device.

