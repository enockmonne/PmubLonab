# Launch Readiness

## Must Have Before Public Launch

- Production MongoDB configured.
- Production backend/admin/web deployed.
- Production API on an always-on paid host, not a free/cold-starting instance.
- Admin login secured with explicit credentials and JWT secret.
- Gemini key configured.
- Upload/import parse validation visible.
- Basic monitoring of deploy failures and API errors.
- Basic API performance monitoring for startup and core data endpoints.
- Paid entitlement model implemented and enforced by the backend.
- Payment provider selected for Burkina Faso mobile money coverage.
- Payment webhook flow tested end to end.
- Admin can grant, extend, revoke, and inspect user/customer access.
- Clear staging-to-production release checklist.

## Should Have Before Wider Sharing

- Invite/access control, paid tester pass, or manually granted expiring entitlement.
- Basic usage analytics.
- Admin correction workflow for bad parse outputs.
- Import queue for larger LONAB batches.
- Result/programme linking improvements.
- Physical Android push notification test.
- LONAB import smoke-tested on staging with one PDF, duplicate retry, then a 3-5 PDF batch.
- Slow/mobile-network QA on staging:
  - first open with empty cache
  - returning open with cached data
  - tab switching
  - selected programme date change
  - horse detail
  - result detail

## Product Readiness

- Programme screen readable and fast.
- Resultats screen clear.
- Pronostics insights explain media agreement.
- Stats tab explains sample size.
- Horse detail gives useful but cautious intelligence.
- No permanent free-access assumption for basic programme data.
- French payment/access states are clear:
  - "Acces actif"
  - "Abonnement expire"
  - "Paiement en attente"
  - "Renouveler"

## Open Decisions

- Final production hosting target.
- Whether staging/test access should be paid, invite-gated, or manually granted with expiry.
- Premium model: programme/day pass vs weekly/monthly passes.
- Customer identity model: device-bound first, phone-number based, or account-based.
- Payment provider/aggregator for Orange Money and Moov Money.
- How much historical LONAB data to import before launch.

## Pre-User-Test Gate

Before inviting external testers, confirm:

- Staging/prod-like API is always-on.
- App has usable cached-data behavior for returning users.
- Slow network and retry states are visible.
- Tester access model is chosen and documented.
- Basic entitlement expiry/revocation path exists, even if payment is not fully automated yet.
- Testers understand whether access is a trial, paid pass, or manually granted preview.

