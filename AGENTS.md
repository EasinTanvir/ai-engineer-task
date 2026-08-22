<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — ParcelPilot Customer Support Agent

You are a **senior AI systems engineer** building a **customer-facing support chatbot** for ParcelPilot, a B2B logistics platform, as a take-home technical assessment. This is an **agentic RAG + tool-use system**, not a plain chatbot and not plain document Q&A.

The agent must answer only from the supplied data pack, correctly apply source authority when sources conflict, perform real calculations (not just lookups), and require explicit confirmation before any state-changing action.

---

## 1. Directory Layout

```
pdf/                          # 6 policy/agreement PDFs (already present)
excelSheet/                   # ParcelPilot_Assessment_Data.xlsx (already present)
.agents/                      # installed agent skills — neon-postgres, langchain (use the JS/TS langchain skill content, never Python)
scripts/
  migrate-pdfs.ts             # chunk + embed all PDFs → document_chunks table
  migrate-sheet.ts            # parse the 3 data tabs → accounts/orders/tickets tables
db/
  schema.ts                   # Drizzle schema
lib/
  llm.ts                      # Groq client
  agent.ts                    # createAgent + tools
tools/
prompts/
  project-context.md          # persistent cross-session context — read this first in any new conversation
```

`.env` already has `DATABASE_URL` and `GROQ_API_KEY` — never ask for these or hardcode them.

---

## 2. Reference Time

The workbook's README tab states: **dataset snapshot = 2026-08-16 11:00 Asia/Kolkata**. Treat this timestamp as "now" for every time-based calculation (delay hours, SLA elapsed time, minutes-since-booking) — never use the real system clock. Currency is INR throughout.

---

## 3. Structured Data Schema (from `ParcelPilot_Assessment_Data.xlsx`)

**`accounts`**: `account_id` (PK), `account_name`, `plan` (Enterprise/Growth/Standard), `status`, `csm`, `contract_file` (nullable — filename of that account's agreement PDF, if any), `premium_support` (bool), `notes`.

**`orders`**: `order_id` (PK), `account_id` (FK), `carrier`, `status` (`BOOKED`/`PICKED_UP`/`DELIVERED`/etc.), `booked_at`, `pickup_window_start`, `pickup_window_end`, `pickup_actual_at` (nullable), `shipment_fee_inr`, `carrier_fault` (bool), `customer_fault` (bool), `cancellation_requested_at` (nullable), `notes`.

**`tickets`**: `ticket_id` (PK), `account_id` (FK), `created_at`, `status`, `subject`, `description`, `channel`, `assigned_to`, `last_customer_message_at`, `historical_resolution` (nullable — **may be wrong**, context only, never authoritative).

Two accounts (`ACCT-003`, `ACCT-004`) have **no `contract_file`** — standard policy applies with no override. Only `ACCT-001` and `ACCT-002` have signed agreements.

`scripts/migrate-sheet.ts` reads all three data tabs from the single xlsx (Readme tab is metadata only, not a table) and inserts rows via Drizzle. Idempotent (safe to re-run).

---

## 4. Document Set & Authority Ranking (from the 6 PDFs)

| File                                             | `source_type` | `version_status` | `authority_rank` | `account_scope` |
| ------------------------------------------------ | ------------- | ---------------- | ---------------- | --------------- |
| 05_Northstar_Logistics_Enterprise_Agreement.pdf  | agreement     | current          | 1 (highest)      | ACCT-001        |
| 06_LumenWorks_Service_Agreement.pdf              | agreement     | current          | 1 (highest)      | ACCT-002        |
| 03_Cancellation_and_Service_Credit_SOP_v4.pdf    | sop           | current          | 2                | null            |
| 01_Support_Policy_v3_CURRENT.pdf                 | policy        | current          | 3                | null            |
| 04_Product_Operations_Guide_and_Known_Issues.pdf | product_guide | current          | 3                | null            |
| 02_Support_Policy_v2_DEPRECATED.pdf              | policy        | **deprecated**   | 99 (lowest)      | null            |

**Precedence rule (stated explicitly in policy v3 §1):** signed customer agreement → current support policy/SOP → current product documentation. The deprecated policy must never be used to answer a current question — only surface it if nothing else answers the query, and flag it as stale. Ticket `historical_resolution` values are context only and can be wrong (e.g. TKT-451's historical resolution claims Growth plan caps bulk upload at 3,000 rows — the actual product limit is 5,000 rows per the Product Ops Guide; 3,000 is only a temporary known-issue workaround). Never let a historical ticket override a current document.

`scripts/migrate-pdfs.ts` recursively chunks each PDF, embeds each chunk, and inserts into `document_chunks` (pgvector column) tagging every row with the metadata above. This mapping is fixed and small (6 files) — hardcode it in the script rather than trying to infer metadata from PDF content.

---

## 5. Tools

1. **`search_policy_docs(query, accountId)`** — pgvector similarity search over `document_chunks`, filtered to `account_scope IN (accountId, null)`, ranked by `authority_rank` ascending (lower = more authoritative), deprecated docs excluded unless nothing else matches.

2. **Structured lookup + calculation tools**, always scoped by `WHERE account_id = :accountId` (server-injected from session, never trusted from model input):
   - `lookup_order(orderId, accountId)`, `lookup_account(accountId)`, `lookup_tickets(accountId)` — raw fetch.
   - `calculate_order_timing(orderId, accountId)` — derive, relative to the snapshot "now": minutes since `booked_at`, pickup delay (`pickup_actual_at` or, if not yet picked up, `now - pickup_window_end`), and whether `carrier_fault`/`customer_fault` is set. Pure arithmetic — do **not** bake policy thresholds (30 min, 2 hr, INR 250, etc.) into this tool; those come from `search_policy_docs` and are applied by the model during synthesis, since the assessment explicitly requires reasoning over the real documents rather than hardcoded answers.
   - `calculate_sla_status(ticketId, accountId)` — elapsed time since `created_at` vs. the account's applicable first-response target (fetched from the agreement if one exists, else the current support policy) — again, fetch the target via `search_policy_docs`; this tool only computes elapsed time.

3. **State-changing action, propose/confirm pattern:**
   - `propose_escalation(ticketOrOrderId, accountId, reason)` — no DB write; returns a draft + confirmation token.
   - `create_escalation(...)` — requires the token from `propose_escalation`; only callable after the user's next message is an explicit confirmation. This makes confirmation structurally required, not merely prompted.

---

## 6. Escalation Judgment

Per policy v3 §2 (severity) and §4 (escalation): P1 = complete outage, confirmed/suspected security incident, or other no-workaround business-critical event — escalate immediately, and if a response-time target is already breached, say so plainly rather than glossing over it. Known issues in the Product Ops Guide (KI-208 bulk-upload failures above ~3,000 rows; KI-211 SwiftShip webhook delay up to 20 minutes) are relevant context when a ticket's symptoms match them — check for a matching known issue before assuming something is a new, unexplained bug. The agent should reach these conclusions by retrieving and reading the actual documents/tickets, not from this table being hardcoded into a prompt.

---

## 7. Confirmation & Access Control (non-negotiable)

- Never execute `create_escalation` without a valid token from a prior `propose_escalation` in the same conversation.
- Every tool that touches `orders`, `accounts`, or `tickets` must filter by the authenticated `accountId`, injected server-side (mocked auth is fine) — never accepted as a raw model-supplied argument used for authorization.

---

## 8. Workflow

1. Read `prompts/project-context.md` first in any new session.
2. For non-trivial features, write a short prompt to `prompts/<feature>.md` (goal, data/tools touched, acceptance criteria) and get approval before implementing.
3. After implementing, report what was built with a sample query/response demonstrating correct source authority and/or confirmation behavior.

---

## 9. Non-Goals (for now)

No internal/ops chatbot, no hosting, no UI polish beyond a functional chat that shows which tool ran, no architecture/product write-ups yet. A correct, access-controlled, confirmation-safe agent over the real data beats a broad but leaky one.
