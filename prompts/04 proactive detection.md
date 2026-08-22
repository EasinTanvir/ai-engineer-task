# Prompt: Proactive Issue Detection

## Goal

An internal-only view (separate from the customer chat) that surfaces patterns across tickets and orders that deserve attention, without waiting for someone to ask. This is a query/analysis feature, not a chat feature — no LLM tool-calling required, though you may optionally use the LLM to summarize findings in plain language.

## Prerequisite

Stages 1–3 complete.

## Requirements

Build a query (or a few queries) over the `tickets` and `orders` tables, relative to the snapshot time, that detect:

1. **SLA risk/breach** — open tickets where elapsed time since `created_at` is approaching or has exceeded the applicable first-response target (reuse the same target-lookup logic from `calculate_sla_status`, generalized to run over all open tickets at once instead of one at a time).
2. **Recurring/related issues** — multiple open tickets whose subject/description cluster around the same theme (e.g. simple keyword/embedding similarity across ticket descriptions is enough — doesn't need to be sophisticated).
3. **Multi-customer impact** — a signal that is not isolated to one account (e.g. the same underlying issue appearing across more than one account's tickets).
4. **Unusual order patterns** — e.g. carrier-fault flags clustering on one carrier, or multiple undelivered/blocked orders on one account.

## Access Control

This view is internal-only (mocked: a simple "internal user" flag/role, separate from the customer account session used by the chat). It is not scoped to a single account — it spans all accounts, which is exactly why it must be gated separately from the customer-facing session.

## Acceptance Criteria — validate against the real data

- TKT-501 (Northstar, complete shipment-creation outage) should surface as a high-priority/SLA-risk item given Northstar's tight P1 target.
- TKT-505 (possible API key exposure) should surface as high-priority given it matches the P1 security-incident definition.
- TKT-502 and TKT-504 should be identifiable as plausibly related to the known issues in the Product Ops Guide (bulk-upload failures, SwiftShip webhook delay) — i.e. the view should help a human notice "this isn't a one-off, it matches a known issue."
- The view must not require the human to have already asked a chat question to see these — it should be visible just by opening the page/endpoint.

## What NOT to do

- Don't merge this into the customer-facing chat session or its access scope.
- Don't over-engineer the "recurring issue" clustering — simple and explainable beats fancy and opaque for a 4-account, 7-ticket demo dataset.

## Report back

Show the query/queries used, the output for the real dataset, and confirm the 4 acceptance cases above appear correctly in the results.
