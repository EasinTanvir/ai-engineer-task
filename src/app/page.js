"use client";

import { useEffect, useRef, useState } from "react";

const ACCOUNTS = [
  { id: "ACCT-001", name: "Northstar Logistics" },
  { id: "ACCT-002", name: "LumenWorks" },
  { id: "ACCT-003", name: "Beacon Retail" },
  { id: "ACCT-004", name: "Axis Labs" },
];

function summarizeToolCall(call) {
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

function ToolTrace({ calls }) {
  if (!calls?.length) return null;
  return (
    <details className="tool-trace">
      <summary>Tools used ({calls.length})</summary>
      <ul>
        {calls.map((call, index) => (
          <li key={`${call.name}-${index}`}>
            <strong>🔧 {summarizeToolCall(call)}</strong>
            <pre>
              {JSON.stringify(
                { args: call.args, result: call.result },
                null,
                2,
              )}
            </pre>
          </li>
        ))}
      </ul>
    </details>
  );
}

function Message({ message }) {
  const isProposal =
    message.role === "assistant" &&
    (message.toolCalls?.some((call) => call.name === "propose_escalation") ||
      /yes,?\s*confirm/i.test(message.content));
  return (
    <article
      className={`message ${message.role} ${isProposal ? "proposal" : ""}`}
    >
      <div className="message-label">
        {message.role === "user" ? "You" : "ParcelPilot Support"}
      </div>
      {isProposal && (
        <div className="proposal-label">
          Confirmation required — replying “yes, confirm” creates a real
          escalation.
        </div>
      )}
      <div className="message-content">{message.content}</div>
      <ToolTrace calls={message.toolCalls} />
    </article>
  );
}

export default function HomePage() {
  const [accountId, setAccountId] = useState(ACCOUNTS[0].id);
  const [sessionReady, setSessionReady] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const chatEndRef = useRef(null);

  async function startSession(nextAccountId) {
    setSessionReady(false);
    setError("");
    setMessages([]);
    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accountId: nextAccountId }),
      });
      if (!response.ok)
        throw new Error("Could not start the selected account session.");
      setSessionReady(true);
    } catch (sessionError) {
      setError(sessionError.message);
    }
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);
  // Session initialization intentionally synchronizes React state with the selected account.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    startSession(accountId);
  }, [accountId]);

  async function handleSubmit(event) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || loading || !sessionReady) return;
    setMessages((current) => [...current, { role: "user", content: message }]);
    setDraft("");
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message,
          history: messages.map(({ role, content }) => ({ role, content })),
        }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(
          body.error ?? "The support agent could not answer right now.",
        );
      setMessages((current) => [
        ...current,
        { role: "assistant", content: body.reply, toolCalls: body.toolCalls },
      ]);
    } catch (chatError) {
      setError(chatError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="chat-shell">
      <header className="chat-header">
        <div>
          <p className="eyebrow">ParcelPilot</p>
          <h1>Customer Support</h1>
          <p className="subtitle">
            Answers use your account data and the supplied policy documents.
          </p>
        </div>
        <label className="account-switcher">
          <span>Signed in as</span>
          <select
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            disabled={loading}
          >
            {ACCOUNTS.map((account) => (
              <option value={account.id} key={account.id}>
                {account.name} ({account.id})
              </option>
            ))}
          </select>
        </label>
      </header>
      <section className="chat-panel" aria-live="polite">
        {!messages.length && !loading && (
          <div className="empty-state">
            <h2>How can we help?</h2>
            <p>
              Ask about orders, tickets, policies, product limits, or an
              escalation for the selected account.
            </p>
          </div>
        )}
        {messages.map((message, index) => (
          <Message message={message} key={`${message.role}-${index}`} />
        ))}
        {loading && (
          <div className="loading-message">
            ParcelPilot Support is checking the relevant account data and
            documents…
          </div>
        )}
        <div ref={chatEndRef} />
      </section>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <form className="composer" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="chat-message">
          Message
        </label>
        <textarea
          id="chat-message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={
            sessionReady
              ? "Ask a support question…"
              : "Starting account session…"
          }
          rows="3"
          disabled={!sessionReady || loading}
        />
        <button
          type="submit"
          disabled={!draft.trim() || !sessionReady || loading}
        >
          {loading ? "Sending…" : "Send"}
        </button>
      </form>
    </main>
  );
}
