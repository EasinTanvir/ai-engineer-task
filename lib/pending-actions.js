import { randomBytes } from "node:crypto";

const state = globalThis.__parcelPilotPendingActions ?? {
  sessions: new Map(),
  ttlMs: 5 * 60 * 1000,
};

globalThis.__parcelPilotPendingActions = state;

function sessionState(sessionId) {
  if (!state.sessions.has(sessionId)) {
    state.sessions.set(sessionId, { turn: 0, pending: new Map() });
  }
  return state.sessions.get(sessionId);
}

export function startConversationTurn(sessionId, message) {
  const session = sessionState(sessionId);
  session.turn += 1;
  const pending = [...session.pending.values()].find((proposal) => proposal.turn === session.turn - 1);
  const isConfirmation = /^\s*(yes|confirm|yes,?\s*confirm)\s*[.!]?\s*$/i.test(message);
  return {
    turn: session.turn,
    confirmedToken: isConfirmation && pending ? pending.token : null,
  };
}

export function createProposal(sessionId, accountId, turn, ticketOrOrderId, reason) {
  const session = sessionState(sessionId);
  const token = randomBytes(24).toString("hex");
  const proposal = {
    token,
    accountId,
    ticketOrOrderId,
    reason,
    turn,
    expiresAt: new Date(Date.now() + state.ttlMs),
  };
  session.pending.set(token, proposal);
  return proposal;
}

export function consumeProposal(sessionId, token, confirmedToken) {
  const session = sessionState(sessionId);
  const proposal = session.pending.get(token);
  if (!proposal) return { error: "No pending escalation proposal exists for this session and token." };
  if (proposal.expiresAt <= new Date()) {
    session.pending.delete(token);
    return { error: "That escalation proposal has expired. Please propose it again." };
  }
  if (token !== confirmedToken) {
    return { error: "Escalation not created: explicit confirmation in the immediately following message is required." };
  }
  session.pending.delete(token);
  return { proposal };
}
