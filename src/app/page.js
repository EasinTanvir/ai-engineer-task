"use client";

import { useEffect, useRef, useState } from "react";
import { ACCOUNTS } from "@/lib/chat";
import { ChatHeader } from "@/components/ChatHeader";
import { MessageList } from "@/components/Messagelist";
import { Composer } from "@/components/Composer";
import { GroqNoticeModal } from "@/components/Shared/GroqNoticeModal";

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
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    <div className="flex h-dvh flex-col overflow-hidden bg-canvas text-ink">
      <GroqNoticeModal />
      <ChatHeader
        accountId={accountId}
        onAccountChange={setAccountId}
        sessionReady={sessionReady}
        loading={loading}
      />

      <MessageList messages={messages} loading={loading} endRef={chatEndRef} />

      <Composer
        draft={draft}
        onDraftChange={setDraft}
        onSubmit={handleSubmit}
        sessionReady={sessionReady}
        loading={loading}
        error={error}
      />
    </div>
  );
}
