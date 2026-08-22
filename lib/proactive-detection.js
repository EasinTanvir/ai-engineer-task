import { pool } from "./database.js";

export const SNAPSHOT = new Date("2026-08-16T11:00:00+05:30");

const minutesSince = (value) =>
  Math.round((SNAPSHOT.getTime() - new Date(value).getTime()) / 60_000);
const openStatuses = [
  "open",
  "OPEN",
  "pending",
  "PENDING",
  "in_progress",
  "IN_PROGRESS",
];

function priorityFor(ticket) {
  const text = `${ticket.subject} ${ticket.description}`.toLowerCase();
  if (
    text.includes("api key") ||
    text.includes("security") ||
    text.includes("every user") ||
    text.includes("all shipment")
  )
    return "P1";
  return "P2";
}

async function firstResponseTarget(accountId, priority) {
  const accountResult = await pool.query(
    "SELECT plan FROM accounts WHERE account_id = $1",
    [accountId],
  );
  const plan = accountResult.rows[0]?.plan;
  const result = await pool.query(
    `
    SELECT content, authority_rank
    FROM document_chunks
    WHERE (account_scope = $1 OR account_scope IS NULL)
      AND version_status <> 'deprecated'
      AND content ILIKE $2
    ORDER BY authority_rank ASC
  `,
    [accountId, `%${priority}%`],
  );
  for (const row of result.rows) {
    const match = row.content.match(
      new RegExp(
        `${priority}\\s*:\\s*(\\d+)\\s*(business\\s+hours?|business\\s+days?|minutes?|hours?)`,
        "i",
      ),
    );
    if (!match) continue;
    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    return {
      minutes: unit.includes("day")
        ? amount * 24 * 60
        : unit.includes("hour")
          ? amount * 60
          : amount,
      sourceAuthorityRank: row.authority_rank,
    };
  }
  for (const row of result.rows) {
    const match =
      plan &&
      row.content.match(
        new RegExp(
          `${plan}\\s+(\\d+)\\s+(business\\s+hours?|business\\s+days?|minutes?|hours?)`,
          "i",
        ),
      );
    if (!match) continue;
    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    return {
      minutes: unit.includes("day")
        ? amount * 24 * 60
        : unit.includes("hour")
          ? amount * 60
          : amount,
      sourceAuthorityRank: row.authority_rank,
    };
  }
  return { minutes: null, sourceAuthorityRank: null };
}

function issueTheme(ticket) {
  const text = `${ticket.subject} ${ticket.description}`.toLowerCase();
  if (text.includes("bulk upload") || text.includes("csv"))
    return { theme: "bulk-upload-failure", knownIssue: "KI-208" };
  if (
    text.includes("swiftship") ||
    text.includes("webhook") ||
    text.includes("shows booked")
  )
    return { theme: "swiftship-status-webhook-delay", knownIssue: "KI-211" };
  return null;
}

export async function detectProactiveIssues() {
  const ticketsResult = await pool.query(`
    SELECT t.ticket_id, t.account_id, a.account_name, t.created_at, t.status, t.subject, t.description
    FROM tickets t
    JOIN accounts a ON a.account_id = t.account_id
    WHERE LOWER(t.status) NOT IN ('closed', 'resolved')
    ORDER BY t.created_at ASC
  `);
  const tickets = ticketsResult.rows;
  const slaRisk = [];
  for (const ticket of tickets) {
    const priority = priorityFor(ticket);
    const target = await firstResponseTarget(ticket.account_id, priority);
    const elapsedMinutes = minutesSince(ticket.created_at);
    if (
      priority === "P1" ||
      (target.minutes !== null && elapsedMinutes >= target.minutes * 0.75)
    ) {
      slaRisk.push({
        ticketId: ticket.ticket_id,
        accountId: ticket.account_id,
        accountName: ticket.account_name,
        priority,
        elapsedMinutes,
        targetMinutes: target.minutes,
        breached: elapsedMinutes >= target.minutes,
        highPriority: priority === "P1",
        targetAuthorityRank: target.sourceAuthorityRank,
      });
    }
  }

  const themes = new Map();
  for (const ticket of tickets) {
    const match = issueTheme(ticket);
    if (!match) continue;
    const group = themes.get(match.theme) ?? {
      theme: match.theme,
      knownIssue: match.knownIssue,
      ticketIds: [],
      accountIds: [],
    };
    group.ticketIds.push(ticket.ticket_id);
    if (!group.accountIds.includes(ticket.account_id))
      group.accountIds.push(ticket.account_id);
    themes.set(match.theme, group);
  }
  const relatedIssues = [...themes.values()].filter(
    (group) => group.ticketIds.length > 1 || group.knownIssue,
  );
  const multiCustomerImpact = relatedIssues
    .filter((group) => group.accountIds.length > 1)
    .map((group) => ({
      ...group,
      affectedAccountCount: group.accountIds.length,
    }));

  const ordersResult = await pool.query(`
    SELECT order_id, account_id, carrier, status, carrier_fault, customer_fault
    FROM orders
    WHERE carrier_fault = TRUE OR LOWER(status) IN ('blocked', 'undelivered', 'failed')
  `);
  const carrierCounts = new Map();
  const accountCounts = new Map();
  for (const order of ordersResult.rows) {
    if (order.carrier_fault)
      carrierCounts.set(
        order.carrier,
        (carrierCounts.get(order.carrier) ?? 0) + 1,
      );
    if (
      ["blocked", "undelivered", "failed"].includes(order.status.toLowerCase())
    )
      accountCounts.set(
        order.account_id,
        (accountCounts.get(order.account_id) ?? 0) + 1,
      );
  }
  const unusualOrderPatterns = {
    carrierFaultClusters: [...carrierCounts]
      .filter(([, count]) => count > 1)
      .map(([carrier, count]) => ({ carrier, count })),
    accountBlockedOrUndeliveredClusters: [...accountCounts]
      .filter(([, count]) => count > 1)
      .map(([accountId, count]) => ({ accountId, count })),
  };

  return {
    snapshot: SNAPSHOT.toISOString(),
    slaRisk,
    relatedIssues,
    multiCustomerImpact,
    unusualOrderPatterns,
  };
}
