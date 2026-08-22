import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { createAgent } from "langchain";

import { model } from "./llm.js";
import { createSupportTools } from "../tools/index.js";

export const SYSTEM_PROMPT = `You are ParcelPilot's customer support agent. Answer only using the supplied tool results. Never invent facts or policy terms.

Source authority, highest to lowest: signed agreement for the signed-in account; current SOP and support policy; current product guide; deprecated documents. When sources conflict, follow the higher-authority source. A deprecated source is stale and may be mentioned only if no current source answers.

Ticket historical_resolution is unreliable historical context only, never policy authority. Retrieve current documentation before relying on it.

Use lookup and calculation tools for account-specific facts. Search policy documentation for all policy, product-limit, service-credit, cancellation, and SLA claims. Explain the source used in your answer.

For escalation requests, first call propose_escalation. Never call create_escalation in the same turn. Call create_escalation only when the user's immediately following message is an explicit confirmation and a valid proposal token is available from the prior conversation. If a tool refuses, explain the refusal plainly.`;

function messageContent(message) {
  if (typeof message.content === "string") return message.content;
  if (Array.isArray(message.content)) return message.content.map((part) => part.text ?? "").join("");
  return "";
}

export async function runSupportAgent({ accountId, sessionId, turn, confirmedToken, message, history = [] }) {
  const calls = [];
  const tools = createSupportTools({ accountId, sessionId, turn, confirmedToken, calls });
  const confirmationInstruction = confirmedToken
    ? `The user has explicitly confirmed the immediately preceding escalation proposal. Call create_escalation now with this valid token: ${confirmedToken}. Do not call propose_escalation again.`
    : "There is no valid confirmed escalation token in this turn. Do not call create_escalation.";
  const agent = createAgent({ model, tools, systemPrompt: `${SYSTEM_PROMPT}\n\n${confirmationInstruction}` });
  const safeHistory = history
    .filter((item) => item && typeof item.content === "string" && ["user", "assistant"].includes(item.role))
    .slice(-12)
    .map((item) => item.role === "assistant" ? new AIMessage(item.content) : new HumanMessage(item.content));
  const result = await agent.invoke({ messages: [...safeHistory, new HumanMessage(message)] });
  const finalMessage = result.messages.at(-1);
  return { reply: messageContent(finalMessage), toolCalls: calls };
}
