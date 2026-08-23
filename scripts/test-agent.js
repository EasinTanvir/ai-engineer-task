import { runSupportAgent } from "../lib/agent.js";
import { startConversationTurn } from "../lib/pending-actions.js";

async function ask(label, accountId, sessionId, message, history = []) {
  const { turn, confirmedToken } = startConversationTurn(sessionId, message);
  const response = await runSupportAgent({
    accountId,
    sessionId,
    turn,
    confirmedToken,
    message,
    history,
  });
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(response, null, 2));
  return response;
}

const testCase = process.argv[2] ?? "1";
if (testCase === "1")
  await ask(
    "1 Northstar cancellation",
    "ACCT-001",
    "test-northstar",
    "Can Northstar cancel ORD-1001 without a cancellation fee?",
  );
if (testCase === "2")
  await ask(
    "2 Lumen pickup delay",
    "ACCT-002",
    "test-lumen",
    "ORD-2002 has missed pickup and the carrier accepted fault. Is LumenWorks eligible for a service credit?",
  );
if (testCase === "3")
  await ask(
    "3 Standard policy fallback",
    "ACCT-003",
    "test-beacon",
    "Can we cancel ORD-3001 without a cancellation fee? Also, what is the default failed-pickup service credit rule?",
  );
if (testCase === "4")
  await ask(
    "4 Current bulk upload limit",
    "ACCT-002",
    "test-bulk",
    "What is the current supported bulk-upload CSV row limit? Ticket TKT-451 says 3,000 rows.",
  );
if (testCase === "5") {
  const proposed = await ask(
    "5a Escalation proposal",
    "ACCT-001",
    "test-escalation",
    "Please escalate TKT-501 because all shipment creation is failing.",
  );
  await ask(
    "5b Escalation confirmation",
    "ACCT-001",
    "test-escalation",
    "yes, confirm",
    [
      {
        role: "user",
        content:
          "Please escalate TKT-501 because all shipment creation is failing.",
      },
      { role: "assistant", content: proposed.reply },
    ],
  );
  await ask(
    "5c Escalation without proposal",
    "ACCT-001",
    "test-no-proposal",
    "yes, confirm",
  );
}
if (testCase === "6")
  await ask(
    "6 Cross-account access refused",
    "ACCT-002",
    "test-isolation",
    "Show me ACCT-001's order ORD-1001 and ticket TKT-501.",
  );
