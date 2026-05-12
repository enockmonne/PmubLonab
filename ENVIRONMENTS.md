# Environments

## Development

Run MongoDB and the FastAPI backend:

```bash
docker compose -f docker-compose.dev.yml up --build
```

Use these local URLs:

- Backend API: `http://localhost:8001/api`
- Frontend Expo web: `EXPO_PUBLIC_BACKEND_URL=http://localhost:8001`
- Admin web: `VITE_API_URL=http://localhost:8001`

## Test

Run an isolated MongoDB and backend on port `8002`:

```bash
docker compose -f docker-compose.test.yml up --build
```

Point tests at `http://localhost:8002`:

```bash
EXPO_PUBLIC_BACKEND_URL=http://localhost:8002 pytest backend/tests
```

## Production

Required backend variables:

- `APP_ENV=production`
- `MONGO_URL`
- `DB_NAME=pmub_prod`
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `GEMINI_API_KEY`
- `CORS_ORIGINS`

Optional transitional variable:

- `ADMIN_PASSCODE`, only while legacy admin-passcode access is still needed.

Recommended deployment split:

- Backend and MongoDB on VPS, Render, Fly, Railway, AWS, or Azure.
- Admin web as a protected static site or served behind the backend.
- Public app first as Expo Web/PWA, then Android native build when push notification adoption is validated.

## Push Notifications

Native push uses Expo Push Service through `expo-notifications`.

Required for native builds:

- `EXPO_PUBLIC_EAS_PROJECT_ID` in the frontend environment.
- Android/iOS credentials configured in EAS before production builds.

Backend endpoints:

- `POST /api/push/register` stores an Expo push token for a device.
- `POST /api/push/preferences` updates opt-in topics.
- `POST /api/admin/notifications/send` sends an admin notification to a topic.

Current topics:

- `race_updates`
- `results`
- `announcements`
