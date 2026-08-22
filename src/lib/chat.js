export const ACCOUNTS = [
  { id: "ACCT-001", name: "Northstar Logistics" },
  { id: "ACCT-002", name: "LumenWorks" },
  { id: "ACCT-003", name: "Beacon Retail" },
  { id: "ACCT-004", name: "Axis Labs" },
];

export function summarizeToolCall(call) {
  if (call.result?.error) return `${call.name} → ${call.result.error}`;
  if (call.name === "search_policy_docs")
    return `${call.name} → ${call.result?.results?.length ?? 0} source result(s)`;
  if (call.name === "lookup_order")
    return `${call.name} → ${call.result?.order_id ?? "no matching order"}`;
  if (call.name === "lookup_tickets")
    return `${call.name} → ${call.result?.length ?? 0} ticket(s)`;
  if (call.name === "propose_escalation")
    return `${call.name} → draft created; confirmation required`;
  if (call.name === "create_escalation")
    return `${call.name} → escalation #${call.result?.escalation?.id ?? "created"}`;
  return `${call.name} → completed`;
}
