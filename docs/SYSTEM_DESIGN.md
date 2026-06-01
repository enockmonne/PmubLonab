# System Design

## Environments

- Local dev: fast iteration, local backend, local or test MongoDB.
- Test/CI: isolated checks with MongoDB service and build verification.
- Staging: shareable feedback environment on Render with MongoDB Atlas.
- Production: future Burkina Faso deployment, explicit secrets, stronger access model.

## Key Backend Modules

- `server.py`: API routes, race library, admin workflows, stats, push token handling.
- `pdf_parser.py`: Gemini-backed PDF extraction.
- `race_data.py`: seed race and fallback constants.
- `auth.py`: admin authentication and JWT handling.

## Key Frontend Areas

- Programmes: current/archive programme display, race insight, betting footer.
- Partants/Horse Detail: horse profile and horse intelligence.
- Pronostics: consensus, media agreement, classifications.
- Resultats: official results and reports.
- Stats: horse, tipster, jockey, trainer leaderboards.

## Key Admin Areas

- Upload PDF with parse validation summary.
- Race management and set-current action.
- LONAB archive preview/import.
- Announcements and logs.
- Settings and account management.

## Important Design Rules

- Insight text should be explainable from structured data.
- Avoid direct betting instructions.
- Keep casual screens simple; put deeper information behind details/tabs.
- Show data coverage and limited-data warnings where useful.

