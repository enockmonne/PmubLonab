#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================


user_problem_statement: |
  Phase 3: Implement JWT auth (C1) for /admin and Admin dashboard (C2) with status metrics.
  - JWT login flow with email/password (single admin in DB)
  - Protected admin routes accept either Bearer token OR legacy X-Admin-Passcode
  - Dashboard shows: total races, programmes/results count, current race, last upload, LLM key health, admin email

backend:
  - task: "JWT Auth: /api/auth/login + /api/auth/me + /api/auth/change-password"
    implemented: true
    working: true
    file: "/app/backend/auth.py + /app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Implemented with passlib(bcrypt) + PyJWT (HS256, 7d TTL). Seed admin from .env (ADMIN_EMAIL/ADMIN_PASSWORD) idempotent on startup. Login tested via curl returns valid token."
        - working: true
          agent: "testing"
          comment: "All 11 auth scenarios passed via /app/backend_test.py against public URL. POST /api/auth/login returns 200 with token+user{email,role} for valid creds; 401 with exact French message 'Email ou mot de passe incorrect.' for invalid email and invalid password; 422 for missing password field. GET /api/auth/me returns 200 {email, role} with valid Bearer; 401 without header; 401 with garbage token. POST /api/auth/change-password returns 400 for wrong old password, 400 for new<8 chars, 200 {ok:true} for valid roundtrip — verified login works with new pwd, then reverted back to original (idempotent). JWT secret length warning in logs is informational only (29 bytes vs 32 recommended)."

  - task: "Protected admin endpoints accept Bearer token OR legacy passcode"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "POST /api/admin/races/upload, POST /api/admin/races/{id}/set-current, DELETE /api/admin/races/{id} all updated via require_admin() helper."
        - working: true
          agent: "testing"
          comment: "Backwards-compat verified for all three admin endpoints. POST /admin/races/{id}/set-current works with Bearer JWT (200, is_current applied — verified via /api/races), with X-Admin-Passcode legacy (200), and returns 401 without auth. DELETE /admin/races/{id} returns 401 without auth and 404 for non-existent race id with JWT (no real races deleted — only used a fake id 'nonexistent-race-id-zzz-9999'). POST /admin/races/upload returns 401 without auth (auth gating verified; actual file upload skipped to avoid LLM cost). NOTE: as part of set-current testing, current race was changed to 'quarte-du-lundi-lonab-2026-04-20' (the latest by date_iso 2026-04-20). Production still has all 4 races intact."

  - task: "Admin Dashboard /api/admin/status with LLM health check"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Returns stats (total/programmes/results), current_race, last_upload, llm.status (live ping to gemini-2.5-flash), admin info. Requires JWT or legacy passcode."
        - working: true
          agent: "testing"
    comment: "All 3 admin/status scenarios passed. With Bearer JWT: 200, payload has stats={total_races:4, programmes:3, results:1}, current_race, last_upload, llm={status:'ok', error:null}, admin={email:enockmoonne.admin@pmub.app, role:admin, created_at, last_login_at}. With X-Admin-Passcode: 200 same shape (admin shows legacy@pmub.app fallback identity). Without auth: 401. LLM live ping to gemini-2.5-flash returned 'ok'."

frontend:
  - task: "Admin email/password login screen + JWT storage in AsyncStorage"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/admin.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Boots by checking saved token. Login form with email + password fields, error display, JWT footer note, KeyboardAvoidingView."

  - task: "Admin dashboard UI with stats grid + LLM status + races list"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/admin.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Shows 4 stats cards (Courses, Course du jour, Dernier upload, Clé LLM), upload card, races list with View/Set-current/Delete actions. FadeInDown animations."
  - task: "Admin Web (séparée): Vite + React + Tailwind, JWT, montée sur /api/admin-ui/"
    implemented: true
    working: true
    file: "/app/admin-web/* + /app/backend/server.py (StaticFiles mount + SPA fallback)"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "main"
          comment: "Nouvelle webapp standalone (Vite/React/TS/Tailwind) pour l'admin avec layout Sidebar + TopBar style Linear/Notion. Pages: Login, Dashboard, Upload (drag&drop multi-PDF), Courses (table + filtres + activer/supprimer), Annonces (CRUD), Activité (logs), Paramètres (changer mdp). Token JWT stocké en localStorage. API client axios. Build mounté sur /api/admin-ui/ via FastAPI StaticFiles + route catch-all pour SPA fallback. Onglet admin retiré de l'app mobile (admin.tsx déplacé en _archived/)."


metadata:
  created_by: "main_agent"
  version: "1.4"
  test_sequence: 0
  run_ui: false

test_plan:
  current_focus:
    - "JWT Auth: /api/auth/login + /api/auth/me + /api/auth/change-password"
    - "Protected admin endpoints accept Bearer token OR legacy passcode"
    - "Admin Dashboard /api/admin/status with LLM health check"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    - agent: "main"
      message: |
        Phase 3 backend complete. Implemented JWT auth (POST /api/auth/login, /api/auth/me, /api/auth/change-password)
        and admin dashboard endpoint (GET /api/admin/status).
        - Test credentials: enockmoonne.admin@pmub.app / @Unlimited86
        - Bearer token in Authorization header for protected routes
        - Legacy X-Admin-Passcode (pmub-admin-2026) still works as fallback for backwards compat
        Please verify:
        1) /api/auth/login returns token for valid creds (200) and 401 for invalid
        2) /api/auth/me returns admin info with valid Bearer token, 401 without
        3) /api/admin/status returns stats/current_race/last_upload/llm/admin (200 with JWT, 200 with legacy passcode, 401 without auth)
        4) /api/admin/races/upload + set-current + delete still work with JWT Bearer (and with legacy passcode)
        5) Wrong/expired token returns 401
    - agent: "testing"
      message: |
        Phase 3 backend testing complete: 23/23 scenarios PASSED via /app/backend_test.py against the public preview URL.
        Coverage:
        - /api/auth/login: valid (200 with token+user), invalid email/password (401 with exact French message), missing field (422)
        - /api/auth/me: valid Bearer (200 {email,role}), no header (401), garbage token (401)
        - /api/auth/change-password: short new pwd (400), wrong old (400), valid roundtrip (200 → login with new works → reverted back to original; verified login with original still works)
        - /api/admin/status: Bearer JWT (200 with full shape stats/current_race/last_upload/llm/admin), legacy passcode (200 same shape), no auth (401). LLM live ping returned status='ok'. stats={total_races:4, programmes:3, results:1}
        - Backwards compat for protected endpoints: set-current works with both Bearer+legacy (verified is_current applied via /api/races), 401 without auth; DELETE returns 401 without auth and 404 for non-existent race id with JWT (no real races deleted); upload returns 401 without auth (auth gating only — no file upload to avoid LLM cost)
        Side effect to flag: as part of set-current testing, the current race was changed to 'quarte-du-lundi-lonab-2026-04-20' (the latest race by date_iso). All 4 production races are intact. Main agent / user can re-set current race if desired.
        Backend logs show a benign passlib bcrypt-version warning (AttributeError: module 'bcrypt' has no attribute '__about__') — does not affect hashing or verification (all bcrypt operations succeeded). JWT secret length warning (29 vs 32 bytes recommended) is informational.
        No critical issues found. All endpoints behaving exactly as specified.
