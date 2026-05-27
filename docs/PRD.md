# Product Requirements Document

## Product

PmubLonab is a horse-racing programme and results app for Burkina Faso PMU'B/LONAB users. It turns official PDF race publications into a clear mobile-first experience with programmes, partants, pronostics, results, reports, stats, and eventually deeper race intelligence.

## Goals

- Make race information easier to read than raw PDFs.
- Give users useful context and insights without overwhelming them.
- Support both casual users and serious bettors through progressive disclosure.
- Keep the public experience mostly French.
- Avoid direct betting promises or guaranteed recommendation language.
- Build toward mobile-first engagement with push notifications.

## Audiences

- Casual users who want to understand the day's race quickly.
- More serious bettors who want deeper form, history, and source-performance data.
- Admin users who upload PDFs, validate extracted data, and manage the current race.
- Future testers/users in Burkina Faso who need a shareable staging/public web experience.

## Core User Jobs

- See the current programme quickly.
- Browse past/future programmes by date.
- Review horse list and key horse details.
- Compare pronostics and consensus.
- See official results and reports.
- Receive useful updates or alerts.
- Understand race context faster than reading a raw PDF.

## Non-Goals For Now

- Do not promise guaranteed betting outcomes.
- Do not build a dense professional betting terminal as the default UI.
- Do not require accounts before the first production launch unless premium access demands it.
- Do not ingest the entire LONAB archive before proving value with recent data.

## MVP Scope

- Mobile-first Expo app with web access.
- Admin web app for PDF upload and race management.
- FastAPI backend with MongoDB storage.
- Gemini-powered PDF parsing.
- Staging environment with shareable links.
- Programme, partants, pronostics, results, archives, and stats screens.
- Push notification foundation.

## Differentiation

The app should become a race intelligence companion, not just a PDF viewer:

- Horse form summaries.
- Win/top-3 rates.
- Jockey/trainer performance.
- Prediction source accuracy.
- Consensus and disagreement analysis.
- Historical trends from LONAB archives.

## Success Metrics

- Users can find current race information in under a few seconds after the app opens.
- Uploaded PDFs produce complete programme and result data.
- Staging testers can understand the race without opening the raw PDF.
- Results and reports are easy to inspect.
- Repeat app opens feel fast because cached data appears immediately.

## Open Product Questions

- What is the first premium feature boundary?
- Should premium be device-bound first, account-based, or both?
- How much historical data is enough before public launch?
- How much manual correction must admin support before production?
