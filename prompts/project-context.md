# Project Context — read this first in any new conversation

Static facts (schema, tools, authority rules, non-goals) live in `AGENTS.md` — don't duplicate them here. This file only tracks **what's actually been built and verified**.

## Build order

Stages live in `prompts/01-...` through `prompts/04-...`. Always implement in order; don't start a stage until the previous one's acceptance criteria are manually verified (not just self-reported by Codex).

## Status

- [x] Stage 1 — Data migration (`01-data-migration.md`). Verified: correct row counts, correct document metadata on spot-check.
- [x] Stage 2 — Agent, tools, `/api/chat` (`02-agent-and-tools.md`). Verified: all 6 acceptance cases passed, including the cross-account access-control test and the confirm-without-proposal rejection test.
- [x] Stage 3 — Chat UI (`03-ui.md`). Verified against the full manual test script (see below). One bug found — see "Known bug" section.
- [x] Stage 4 — Proactive issue detection (`04 proactive detection.md`). Verified against the real dataset: internal role-gated endpoint surfaces P1/SLA risk, known-issue matches, and order-pattern signals.

## Current routes (as of last verified state)

- `/` — chat UI
- `/api/session` — mocked account session
- `/api/chat` — agent chat API
- No proactive-detection route exists yet — stage 4 will add it.

## Resolved bug — account-name mislabeling

**Symptom:** when a customer asks about another account's data by name (e.g. "Show me Northstar's tickets" while logged in as a different account), the agent correctly scopes the underlying query to the logged-in session's own account (no actual data leak), but then **incorrectly labels the returned results as belonging to the account the customer named**, rather than stating it cannot access that account's data.

**Example that reproduced it:** logged in as ACCT-002 (LumenWorks), asked "Show me Northstar's tickets" → response returned ACCT-002's own tickets (TKT-502, TKT-451) but described them as "tickets that belong to the Northstar account (account ID ACCT-002)" — factually wrong on the account name, and misleading about what was actually accessed.

**Required fix:** when a user references an account/customer other than their own, the agent must explicitly state it cannot access that other account's data, and must never relabel its own session's results under a different account's name.

Fixed in `lib/agent.js` system prompt and retested with the reproduction, Section H access-control case, and the inverse account-name phrasing.

**Retest after fixing:** logged in as ACCT-002, ask "Show me Northstar's tickets" — correct response clarifies it can only show LumenWorks' (ACCT-002's) own tickets, not Northstar's, without claiming those tickets belong to Northstar.

## Known-good behavior (verified via manual test script, don't regress these)

- ACCT-001 (Northstar): ORD-1001 (BOOKED) cancels fee-free via agreement override; ORD-1002 (PICKED_UP) correctly blocked, routed to return-to-origin.
- ACCT-002 (LumenWorks): ORD-2001 correctly charged ₹250 (agreement has no waiver, SOP default applies); ORD-2002 correctly gets the agreement's fixed ₹300 credit (not the SOP's default ₹500/2hr rule).
- ACCT-003 (Beacon, no agreement): ORD-3001 correctly cancels fee-free (within 30-min grace, general SOP).
- ACCT-004 (Axis Labs): ORD-4001 (DELIVERED) correctly blocked from cancellation.
- TKT-451's misleading historical resolution (claims 3,000-row limit) does not override the correct current answer (5,000 rows, Product Ops Guide) — agent correctly distinguishes plan limit from KI-208 workaround advice.
- TKT-450 conflict correctly detected: historical ₹250 charge flagged as contradicting Northstar's current no-fee agreement.
- Deprecated policy (v2) correctly excluded from current SLA answers.
- SLA breach detection correct for TKT-501 (Northstar P1, 15-min target, 30 min elapsed → breached) and TKT-505 (security incident, 30-min target, ~2.5 hrs elapsed → severely breached).
- KI-211 (webhook delay) correctly surfaced as a likely explanation for TKT-504-style questions instead of assuming a new bug.
- Multi-tool parallel reasoning confirmed (ORD-2002 eligibility + escalation request in one exchange).
- `create_escalation` cannot fire without a prior `propose_escalation` token in the same conversation (negative test passed: fresh conversation, "yes, confirm" with nothing proposed → correctly refused).
- Cross-account data access blocked at the query layer (ACCT-002 asking for ORD-1001 → correctly "not found," no leak) — though see the labeling bug above for the account-_name_ confusion issue.

## Open items / things to revisit later

- Business-hours vs. calendar-hours handling for SLA targets — confirm how Stage 2 actually implemented this; calendar hours is an acceptable simplification if that's what was done, note it as an explicit assumption in the eventual architecture write-up.
- Hosting, architecture note, product note, demo video — all explicitly deferred, not started.
