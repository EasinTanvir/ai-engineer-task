import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { db, ensureEscalationsTable, pool } from "../lib/database.js";
import { embedText } from "../lib/embeddings.js";
import { consumeProposal, createProposal } from "../lib/pending-actions.js";

const SNAPSHOT = new Date("2026-08-16T11:00:00+05:30");
const minutesBetween = (from, to) =>
  Math.round((to.getTime() - new Date(from).getTime()) / 60_000);
const vectorLiteral = (embedding) => `[${embedding.join(",")}]`;

function record(calls, name, args, action) {
  return async (input) => {
    const result = await action(input);
    calls.push({ name, args: input, result });
    return result;
  };
}

async function findScopedTarget(accountId, targetId) {
  const order = await pool.query(
    "SELECT order_id AS id FROM orders WHERE order_id = $1 AND account_id = $2",
    [targetId, accountId],
  );
  if (order.rowCount) return "order";
  const ticket = await pool.query(
    "SELECT ticket_id AS id FROM tickets WHERE ticket_id = $1 AND account_id = $2",
    [targetId, accountId],
  );
  return ticket.rowCount ? "ticket" : null;
}

export function createSupportTools({
  accountId,
  sessionId,
  turn,
  confirmedToken,
  calls,
}) {
  return [
    tool(
      record(
        calls,
        "search_policy_docs",
        { query: z.string().min(1) },
        async ({ query }) => {
          const embedding = await embedText(query);
          const params = [accountId, vectorLiteral(embedding)];
          const current = await pool.query(
            `
        SELECT * FROM (
          SELECT DISTINCT ON (source_file) source_file, content, source_type, version_status, authority_rank, account_scope,
            embedding <=> $2::vector AS distance
          FROM document_chunks
          WHERE (account_scope = $1 OR account_scope IS NULL) AND version_status <> 'deprecated'
          ORDER BY source_file, embedding <=> $2::vector ASC
        ) ranked
        ORDER BY authority_rank ASC, distance ASC
        LIMIT 5
      `,
            params,
          );
          const rows = current.rowCount
            ? current.rows
            : (
                await pool.query(
                  `
        SELECT * FROM (
          SELECT DISTINCT ON (source_file) source_file, content, source_type, version_status, authority_rank, account_scope,
            embedding <=> $2::vector AS distance
          FROM document_chunks
          WHERE account_scope = $1 OR account_scope IS NULL
          ORDER BY source_file, embedding <=> $2::vector ASC
        ) ranked
        ORDER BY authority_rank ASC, distance ASC
        LIMIT 5
      `,
                  params,
                )
              ).rows.map((row) => ({ ...row, stale: true }));
          return {
            query,
            results: rows.map((row) => ({
              ...row,
              content: row.content.slice(0, 900),
              stale: row.stale ?? false,
            })),
          };
        },
      ),
      {
        name: "search_policy_docs",
        description:
          "Search authoritative agreements, SOPs, policies, and product documentation for the signed-in account.",
        schema: z.object({ query: z.string().min(1) }),
      },
    ),
    tool(
      record(
        calls,
        "lookup_order",
        { orderId: z.string().min(1) },
        async ({ orderId }) => {
          const result = await pool.query(
            "SELECT * FROM orders WHERE order_id = $1 AND account_id = $2",
            [orderId, accountId],
          );
          return result.rowCount
            ? result.rows[0]
            : { error: "Order not found for the signed-in account." };
        },
      ),
      {
        name: "lookup_order",
        description: "Look up one order belonging to the signed-in account.",
        schema: z.object({ orderId: z.string().min(1) }),
      },
    ),
    tool(
      record(calls, "lookup_account", {}, async () => {
        const result = await pool.query(
          "SELECT * FROM accounts WHERE account_id = $1",
          [accountId],
        );
        return result.rows[0] ?? { error: "Signed-in account was not found." };
      }),
      {
        name: "lookup_account",
        description: "Look up the signed-in account only.",
        schema: z.object({}),
      },
    ),
    tool(
      record(calls, "lookup_tickets", {}, async () => {
        const result = await pool.query(
          "SELECT * FROM tickets WHERE account_id = $1 ORDER BY created_at DESC",
          [accountId],
        );
        return result.rows;
      }),
      {
        name: "lookup_tickets",
        description: "List tickets for the signed-in account only.",
        schema: z.object({}),
      },
    ),
    tool(
      record(
        calls,
        "calculate_order_timing",
        { orderId: z.string().min(1) },
        async ({ orderId }) => {
          const result = await pool.query(
            "SELECT * FROM orders WHERE order_id = $1 AND account_id = $2",
            [orderId, accountId],
          );
          if (!result.rowCount)
            return { error: "Order not found for the signed-in account." };
          const order = result.rows[0];
          const pickupReference = order.pickup_actual_at ?? SNAPSHOT;
          const pickupDelayMinutes = minutesBetween(
            order.pickup_window_end,
            pickupReference,
          );
          return {
            orderId: order.order_id,
            minutesSinceBooked: minutesBetween(order.booked_at, SNAPSHOT),
            pickupDelayMinutes,
            pickupDelayHours: Number((pickupDelayMinutes / 60).toFixed(2)),
            carrierFault: order.carrier_fault,
            customerFault: order.customer_fault,
          };
        },
      ),
      {
        name: "calculate_order_timing",
        description:
          "Calculate booking and pickup timing for an order belonging to the signed-in account, using the dataset snapshot time.",
        schema: z.object({ orderId: z.string().min(1) }),
      },
    ),
    tool(
      record(
        calls,
        "calculate_sla_status",
        { ticketId: z.string().min(1) },
        async ({ ticketId }) => {
          const result = await pool.query(
            "SELECT * FROM tickets WHERE ticket_id = $1 AND account_id = $2",
            [ticketId, accountId],
          );
          if (!result.rowCount)
            return { error: "Ticket not found for the signed-in account." };
          const ticket = result.rows[0];
          return {
            ticketId: ticket.ticket_id,
            elapsedMinutes: minutesBetween(ticket.created_at, SNAPSHOT),
            elapsedHours: Number(
              (minutesBetween(ticket.created_at, SNAPSHOT) / 60).toFixed(2),
            ),
          };
        },
      ),
      {
        name: "calculate_sla_status",
        description:
          "Calculate elapsed time for a ticket belonging to the signed-in account, using the dataset snapshot time. This does not apply any SLA threshold.",
        schema: z.object({ ticketId: z.string().min(1) }),
      },
    ),
    tool(
      record(
        calls,
        "propose_escalation",
        { ticketOrOrderId: z.string().min(1), reason: z.string().min(1) },
        async ({ ticketOrOrderId, reason }) => {
          const targetType = await findScopedTarget(accountId, ticketOrOrderId);
          if (!targetType)
            return {
              error: "Ticket or order not found for the signed-in account.",
            };
          const proposal = createProposal(
            sessionId,
            accountId,
            turn,
            ticketOrOrderId,
            reason,
          );
          return {
            draft: {
              accountId,
              ticketOrOrderId,
              targetType,
              reason,
              status: "open",
            },
            confirmationToken: proposal.token,
            instruction:
              "No escalation was created. Ask the user to reply with exactly 'yes, confirm' in their next message.",
          };
        },
      ),
      {
        name: "propose_escalation",
        description:
          "Draft an escalation for a signed-in-account ticket or order. This never writes to the database.",
        schema: z.object({
          ticketOrOrderId: z.string().min(1),
          reason: z.string().min(1),
        }),
      },
    ),
    tool(
      record(
        calls,
        "create_escalation",
        { token: z.string().min(1) },
        async ({ token }) => {
          const resolution = consumeProposal(sessionId, token, confirmedToken);
          if (resolution.error) return { error: resolution.error };
          await ensureEscalationsTable();
          const proposal = resolution.proposal;
          const inserted = await pool.query(
            `
        INSERT INTO escalations (account_id, ticket_or_order_id, reason, status, created_at)
        VALUES ($1, $2, $3, 'open', NOW())
        RETURNING id, account_id, ticket_or_order_id, reason, status, created_at
      `,
            [proposal.accountId, proposal.ticketOrOrderId, proposal.reason],
          );
          return { success: true, escalation: inserted.rows[0] };
        },
      ),
      {
        name: "create_escalation",
        description:
          "Create a proposed escalation only after the user explicitly confirmed it in the immediately following message.",
        schema: z.object({ token: z.string().min(1) }),
      },
    ),
  ];
}
