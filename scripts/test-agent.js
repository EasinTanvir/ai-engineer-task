import { runSupportAgent } from "../lib/agent.js";
import { startConversationTurn } from "../lib/pending-actions.js";

async function ask(accountId, sessionId, message, history = []) {
  const { turn, confirmedToken } = startConversationTurn(sessionId, message);
  const response = await runSupportAgent({
    accountId,
    sessionId,
    turn,
    confirmedToken,
    message,
    history,
  });
  console.log(JSON.stringify(response, null, 2));
  return response;
}

await ask(
  "ACCT-001",
  "test-northstar",
  "Can Northstar cancel ORD-1001 without a cancellation fee?",
);
