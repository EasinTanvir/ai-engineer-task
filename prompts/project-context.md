# Project Context — read this first in any new conversation

Static facts (schema, tools, authority rules, non-goals) live in `AGENTS.md` — don't duplicate them here. This file only tracks **what's actually been built and verified**.

## Status

- [x] Stage 1 — Data migration. Verified.
- [x] Stage 2 — Agent, tools, `/api/chat`. Verified against all 6 acceptance cases.
- [x] Stage 3 — Chat UI. Verified against the full manual test script.
- [x] Bug fix — account-name mislabeling (`05-fix-account-labeling-bug.md`). Verified: agent now correctly refuses to relabel its own account's data under a different account's name.
- [x] Stage 4 — Proactive issue detection (`04-proactive-detection.md`). Verified against real data: TKT-501 and TKT-505 correctly flagged as breached P1s; TKT-502/TKT-504 correctly matched to KI-208/KI-211; unauthenticated access returns 403, internal-role access returns detector output.

**Core minimum requirements + chosen extra problem are functionally complete.**

## Current routes

- `/` — chat UI
- `/api/session` — mocked account session
- `/api/chat` — agent chat API
- `/api/internal/proactive-detection` — internal-only insights view (mocked role via `x-parcelpilot-role: internal` header — client-settable, acceptable for a mocked-auth assessment but should be named explicitly as an assumption in the architecture note)

## Known limitations to name explicitly in the architecture/product notes (not bugs, but worth being deliberate about)

- Internal-role check for proactive detection is a plain header, not a real session/JWT — intentional mocking, flag as a production trade-off.
- No multi-customer/cross-account cluster currently surfaces from the detector — correct given the dataset only has 7 tickets with no overlapping pattern across accounts; the query logic itself is not scoped to one account, so the capability exists even though this dataset doesn't trigger it.
- Business-hours vs. calendar-hours handling for SLA — confirm how it was implemented; calendar hours is an acceptable simplification if that's what was done, note it as an assumption.

## Cleanup remaining

- [ ] Pre-existing React hook-order lint issue in `src/app/page.js` — unrelated to recent feature work, fix in an isolated pass before submission.

## Submission items not yet started

- [ ] Hosting/deployment (preferred, not mandatory)
- [ ] Architecture note (agent design, tool design, source reliability/conflict handling, trade-offs)
- [ ] Product note (chosen extra problem, what's left out, one success metric)
- [ ] ~5-min demo video
- [ ] AI tool usage statement (Codex usage)
- [ ] Repo README with setup/run instructions
