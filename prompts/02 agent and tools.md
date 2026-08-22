# Prompt: Agent, Tools & Chat API

## Goal

Build the LangChain.js agent, all required tools, and a single `/api/chat` endpoint on top of the already-migrated data. This stage is done when the agent correctly answers the two example questions from the assessment with proper source authority, and correctly refuses to act on an escalation without confirmation.

## Prerequisite

Stage 1 (`prompts/01-data-migration.md`) is complete and verified. Do not re-touch the migration scripts or schema in this stage except to add the `escalations` table (see below).

## Mocked Auth / Account Context

Add a minimal mocked login: the user picks one of the 4 accounts (ACCT-001..004) to "log in as." Store the chosen `accountId` server-side (session/cookie) — this is the only source of truth for authorization. The LLM must never be trusted to supply `accountId` as a tool argument for access-control purposes; every tool call should have `accountId` injected by the API route from the session, not read from the model's function-call output.

## Tools to Build (in `tools/`)

1. `search_policy_docs(query)` — pgvector similarity search over `document_chunks`, filtered to `account_scope IN (sessionAccountId, null)`, ordered by `authority_rank` ascending, excluding `version_status = 'deprecated'` unless no other result exists (if so, include it but mark it `stale: true` in the return value).
2. `lookup_order(orderId)`, `lookup_account()`, `lookup_tickets()` — scoped fetches, `accountId` from session, never a function-call parameter.
3. `calculate_order_timing(orderId)` — returns minutes since booked, pickup delay in minutes/hours relative to the snapshot time (2026-08-16 11:00 Asia/Kolkata, not the real clock), and the `carrier_fault`/`customer_fault` flags. No policy thresholds inside this tool.
4. `calculate_sla_status(ticketId)` — returns elapsed time since `created_at` relative to snapshot time. No SLA targets hardcoded here — the agent fetches the applicable target via `search_policy_docs` and compares.
5. `propose_escalation(ticketOrOrderId, reason)` — no DB write. Returns a draft object plus a random confirmation token; store the pending proposal server-side (in-memory map or a new `pending_actions` table) keyed by session + token, with a short TTL.
6. `create_escalation(token)` — looks up the pending proposal by token + session; if missing/expired, refuse and explain; if valid, insert into a new `escalations` table (`id`, `account_id`, `ticket_or_order_id`, `reason`, `status`, `created_at`) and return success.

## Agent Wiring

- `lib/agent.ts`: `createAgent` with Groq model + all 6 tools + a system prompt that encodes: the source-authority precedence rule (agreement > SOP/policy > product guide > deprecated), the instruction to treat `historical_resolution` as unreliable context only, and the instruction to always call `propose_escalation` before `create_escalation`, only calling the latter after an explicit user confirmation in the next turn.
- `/api/chat` (single endpoint): accepts `{ message, history }`, reads `accountId` from session, binds all tools to that `accountId` via closure before passing them to the agent, invokes the agent, returns `{ reply, toolCalls }` where `toolCalls` is a list of `{ name, args, result }` for UI display in the next stage.

## Acceptance Criteria — test these exact cases

1. Logged in as ACCT-001, ask: _"Can Northstar cancel ORD-1001 without a cancellation fee?"_ → agent should find ORD-1001 is `BOOKED`/not picked up, retrieve the Northstar agreement (not the general SOP), and answer **no fee**, citing the agreement's no-fee-regardless-of-timing clause.
2. Logged in as ACCT-002, ask about a pickup delay on ORD-2002-style scenario → agent should retrieve the LumenWorks agreement's **4-hour** threshold and **INR 300** fixed credit (not the SOP's default 2-hour/INR 500 rule).
3. Logged in as ACCT-003 or ACCT-004 (no agreement), ask the same style of question → agent should correctly fall back to the general SOP (30-min cancellation grace, 2-hour/INR 500 default credit).
4. Ask a question where TKT-451's `historical_resolution` is misleading (bulk upload row limit) → agent should give the correct current answer (5,000 rows) from the Product Ops Guide, not the wrong historical figure, and ideally note the discrepancy.
5. Ask the agent to escalate a ticket → it must call `propose_escalation` and show the draft; only after you reply "yes, confirm" should it call `create_escalation` successfully. Attempting to trigger `create_escalation` without a prior proposal in the conversation must fail gracefully.
6. While logged in as ACCT-002, ask about ACCT-001's orders/tickets by ID → must be refused/not found, never returned.

## What NOT to do

- No UI work yet (stage 3).
- No proactive detection work yet (stage 4).
- Don't hardcode any example answers — the acceptance tests must pass via real retrieval/calculation, not special-cased strings.

## Report back

Show the system prompt, the final tool list with signatures, and the actual agent output for all 6 acceptance cases above.
