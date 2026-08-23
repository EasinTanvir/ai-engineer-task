# Architecture Note

## Agent Design

The system is a single LangChain.js agent (`createAgent`, Groq-hosted model) exposed through one endpoint, `/api/chat`. Rather than a fixed retrieval pipeline, the model is given a set of tools and decides at runtime which to call — including calling multiple tools in the same turn when a question genuinely needs more than one source (e.g. an order lookup plus a policy search).

Two things are deliberately handled outside the model's judgment rather than left to the prompt:

- **Access control.** The authenticated account ID comes from a server-side session and is injected into every tool call. It is never accepted as a model-supplied argument used for authorization, so the model cannot be prompted or tricked into querying another account's data.
- **Action confirmation.** Whether a "confirm" is valid is computed server-side (a regex check against the user's literal message, correlated to a specific pending proposal from the immediately preceding turn) before the model is even invoked. The model is then told plainly whether a valid confirmation token exists — it never decides this itself. This means the escalation-creation tool is structurally unusable without a real, immediately-prior confirmation, regardless of what the model outputs.

## Tool Design

Three tool categories, matching the assessment's requirement:

1. **Document search** (`search_policy_docs`) — pgvector similarity search over chunked PDFs, scoped to the account and filtered/ranked by document authority.
2. **Structured lookup & calculation** (`lookup_order`, `lookup_account`, `lookup_tickets`, `calculate_order_timing`, `calculate_sla_status`) — direct queries and derived calculations (pickup delay, ticket age) against Postgres. Calculation tools deliberately return only computed timing facts, never policy thresholds — those are always retrieved from the documents, so the system can't silently hardcode an answer that should come from the source of truth.
3. **State-changing action** (`propose_escalation` → `create_escalation`) — a two-step, token-gated pattern. The propose step never writes to the database; the create step requires a token that only exists if a proposal was made and the very next user message was an explicit confirmation.

## Document & Structured-Data Handling

- **Documents**: recursively chunked, embedded locally (no per-token API cost), stored in Postgres via `pgvector`. Each chunk carries metadata — `source_type`, `version_status`, `authority_rank`, `account_scope` — assigned per-file at ingestion time, since the document set is small and fixed rather than inferred heuristically.
- **Structured data**: the source spreadsheet is loaded into relational tables (`accounts`, `orders`, `tickets`) via Drizzle, scoped by foreign key to `account_id`. All time-based reasoning uses the dataset's stated snapshot time rather than the real system clock, so answers stay consistent with the source data regardless of when the system is actually run.
- Both ingestion scripts are idempotent (delete-then-insert per run) so the pipeline can be safely re-run against updated source data.

## Source Reliability & Conflict Handling

The system encodes an explicit authority order rather than treating all retrieved text equally: **signed customer agreement > current SOP/support policy > current product documentation > deprecated documents**. Deprecated content is excluded from retrieval by default and only surfaced if nothing current answers the question.

Ticket `historical_resolution` data is treated as unreliable context, never as policy authority — verified against a real case in the source data where a closed ticket's historical resolution actually contradicts the current, higher-authority agreement. The agent is instructed to flag this kind of contradiction rather than repeat it.

Fields that can be genuinely unknown (e.g. carrier/customer fault on an order) are stored as nullable rather than forced into a boolean, and the agent is explicitly instructed to treat "unknown" as a reason to decline a confident answer and suggest verification — not to default to "no fault."

## Major Technical Trade-offs

- **Retrieval returns one chunk per document, ranked by authority**, rather than pure top-k nearest neighbor across all chunks. This guarantees the highest-authority source (e.g. a customer's agreement) is always considered when relevant, at the cost of not scaling gracefully to a much larger document set — acceptable for a fixed 6-document source pack.
- **No versioned schema migrations** — table creation is idempotent raw DDL run at startup rather than Drizzle Kit migration files. Sufficient for this project's scope; would need proper migrations for a live product with evolving schema.
- **No vector index (ivfflat/hnsw)** on the embedding column — a full scan is fine at a few hundred chunks; would need an index at real scale.
- **Mocked authentication** throughout (account selection for the customer chat, a header-based role check for the internal view) — appropriate for the assessment's scope, explicitly not production-grade.
