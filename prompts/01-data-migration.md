# Prompt: Data Migration Scripts

## Goal

Build the two one-time migration scripts described in AGENTS.md §1/§3/§4. No agent, no tools, no API, no UI in this stage — just get the real data into Postgres correctly. Do not proceed past this stage until both scripts run successfully and the acceptance checks below pass.

## Scope

1. `db/schema.ts` — Drizzle schema for `accounts`, `orders`, `tickets`, and `document_chunks` (pgvector column), per the exact field lists in AGENTS.md §3 and §4.
2. `scripts/migrate-sheet.ts` — reads `excelSheet/ParcelPilot_Assessment_Data.xlsx`, parses the `accounts`, `orders`, and `tickets` tabs (ignore the `Readme` tab — it's metadata only), inserts rows via Drizzle.
3. `scripts/migrate-pdfs.ts` — reads all 6 files in `pdf/`, chunks each with a recursive splitter, embeds each chunk, inserts into `document_chunks` tagging every row with the exact metadata table from AGENTS.md §4 (hardcode the filename → metadata mapping, don't infer it).

## Requirements

- Both scripts must be **idempotent** — safe to re-run without creating duplicate rows (e.g. delete-then-insert, or upsert on primary key).
- Use the JS/TS langchain skill content for chunking/embedding conventions, and the neon-postgres skill for connection setup — not Python equivalents.
- No hardcoded policy thresholds, dollar/rupee amounts, or SLA numbers anywhere in these scripts — that content belongs in the PDFs and gets retrieved later, not baked into migration code.
- Read `DATABASE_URL` from `.env`; do not print or log secrets.

## Acceptance Criteria

- Running `migrate-sheet.ts` results in exactly 4 accounts, 6 orders, 7 tickets in the DB, matching the source data.
- Running `migrate-pdfs.ts` results in `document_chunks` rows for all 6 PDFs, each row carrying correct `source_type`, `version_status`, `authority_rank`, and `account_scope`.
- A manual spot-check query confirms: the Northstar agreement chunks have `account_scope = 'ACCT-001'`, and the deprecated policy chunks have `authority_rank = 99`.
- Re-running both scripts does not duplicate rows.

## What NOT to do in this stage

- Do not build any LangChain tools, the agent, the API route, or the UI yet.
- Do not write any synthesis/reasoning logic — this stage is pure data loading.

## Report back

After implementing, show: the final `db/schema.ts`, the row counts from both scripts after running them, and the spot-check query results above.
