# Architecture

## System Overview

The system has three main surfaces:

- Backend API: FastAPI, MongoDB, PDF parsing, admin auth, push notification foundation.
- Mobile/Web app: Expo React Native, shared staging web build, programme/result/insight views.
- Admin web: Vite React app for uploads, validation, races, announcements, logs, settings, and LONAB import preview/import.

## Data Flow

1. Admin uploads a PDF or discovers/imports LONAB PDFs.
2. Backend parses the PDF with the existing parser pipeline.
3. Parsed data is normalized into a race document.
4. MongoDB stores race, horses, predictions, previous results, betting info, parse quality, and import metadata.
5. Frontend reads structured API responses and renders programme, result, stats, and insight views.

## External Services

- MongoDB Atlas for staging database.
- Gemini API for PDF extraction.
- Render for staging backend/admin/web deployment.
- Expo infrastructure for push notification tokens.
- LONAB public website for future archive ingestion.

## Current Deployment Shape

- Staging API: Render web service.
- Staging web app: Render static site.
- Staging admin: Render static site.
- Local dev: Expo web on localhost and backend on localhost.

