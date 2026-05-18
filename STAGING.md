# Shareable Staging Environment

This project uses local `dev` and `test` Docker Compose files, plus a hosted staging environment for feedback links.

## Target Staging URLs

The Render Blueprint in `render.yaml` is configured to create:

- Public web app: `https://pmublonab-staging-web.onrender.com`
- Admin web: `https://pmublonab-staging-admin.onrender.com`
- Backend API: `https://pmublonab-staging-api.onrender.com/api`

If Render changes any generated subdomain, update `render.yaml` and the affected environment variables.

## Required External Setup

1. Create a MongoDB Atlas staging cluster or database.
2. Create a database user with read/write access.
3. Copy the MongoDB connection string.
4. In Render, create a new Blueprint from this GitHub repository.
5. When Render prompts for secret values, enter:

- `MONGO_URL`: MongoDB Atlas connection string
- `ADMIN_EMAIL`: staging admin email
- `ADMIN_PASSWORD`: staging admin password
- `ADMIN_PASSCODE`: temporary passcode for legacy admin endpoints
- `GEMINI_API_KEY`: Gemini API key for PDF parsing
- `EXPO_PUBLIC_EAS_PROJECT_ID`: Expo project id, if push testing is needed

`JWT_SECRET` is generated automatically by Render.

## Staging Rules

- Use staging for feedback and demos.
- Do not put production data in staging.
- Use a separate MongoDB database: `pmub_staging`.
- Keep staging admin credentials different from production.
- Keep `ADMIN_PASSCODE` temporary; remove it once admin JWT login is enough.

## Smoke Tests

After the first successful deploy:

```powershell
Invoke-WebRequest -UseBasicParsing https://pmublonab-staging-api.onrender.com/api/races
```

Expected status: `200`.

Then open:

- `https://pmublonab-staging-web.onrender.com`
- `https://pmublonab-staging-admin.onrender.com`

Verify the public app loads race data and the admin app can log in.

## Notes

- Render Blueprints use `render.yaml` in the repo root.
- Render supports Docker services with `dockerfilePath` and `dockerContext`.
- Static sites use `staticPublishPath`.
- Expo web export outputs static files into `frontend/dist`.
