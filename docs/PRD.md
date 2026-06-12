# Product Requirements Document

## Product Goal

PmubLonab is a French-first PMU'B companion for Burkina Faso users. The product should make official programme and result data easier to understand, then add structured insights that are difficult to get from raw PDFs alone.

## Target Users

- Casual users who want a clear view of programmes, partants, pronostics, and official results.
- Serious users who want historical signals, horse profiles, media agreement, and statistical context.
- Admin users who upload PDFs, validate extraction quality, and manage the active race.

## Core Value

- Clean programme and result presentation.
- Faster access to current and historical races.
- Insight layers built from structured data: consensus, form, results, horse history, jockey/trainer stats, and source performance.
- Admin workflow that makes PDF extraction quality visible.
- Paid access to organized programme data and insights, even at a low entry price.

## Non-Goals

- Do not position the app as a direct betting advisor.
- Do not promise guaranteed outcomes.
- Do not require accounts for the first public feedback phase.
- Do not bulk-import all historical PDFs until preview, dedupe, and parse-quality checks are proven.
- Do not make basic programme/raw PDF-style access permanently free.

## Success Criteria

- Staging users can open a shareable web/PWA link and understand the current programme.
- Admin can upload or import PDFs and see extraction quality.
- Race, horse, pronostic, and stats screens provide useful context beyond raw PDF display.
- Historical ingestion improves insight quality without creating duplicate or low-confidence data silently.
- External testers can use the app on mobile data without the app feeling frozen or unreliable.
- Paid-access expectations are clear before public testing begins.

## Robustness Requirement

- Mechanical PDF tables such as Paris Turf / Tierce Magazine odds should be extracted deterministically where practical, with LLM parsing reserved for narrative or interpretive sections.
- Admin validation should make parser confidence, missing sections, and fallback behavior visible before data is trusted for user-facing insights.

## Performance Requirement

- The app should be designed for mobile-network usage in Burkina Faso, not only strong Wi-Fi.
- Returning users should see cached programme/result data immediately when available.
- Slow network states should be explicit and recoverable, with French copy and retry actions.
- Key API endpoints should be measured before deciding whether to migrate away from Render.
- Production-like user testing should not rely on a free/cold-starting backend instance.

## Monetization Requirement

- Basic programme access is paid. The price can be minimal, but the product should not establish a permanent free expectation.
- Initial packaging should favor simple passes:
  - programme/day pass, if simple to operate
  - weekly pass
  - monthly pass
- Premium analytics can be a later tier for deeper historical stats, alerts, and advanced filters.
- The backend must own access control through entitlements, not the frontend alone.
- Burkina Faso payment support should prioritize Orange Money and Moov Money, ideally through an aggregator before direct operator integrations.
- Admin must eventually be able to grant, extend, revoke, and inspect customer access.

