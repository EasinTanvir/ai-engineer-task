"use client";

import { Send } from "lucide-react";
import { Message, TypingIndicator } from "./ToolTrace";

export function MessageList({ messages, loading, endRef }) {
  return (
    <section
      aria-live="polite"
      className="min-h-0 flex-1 overflow-y-auto scroll-smooth"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6">
        {!messages.length && !loading && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Send size={18} />
            </div>
            <h2 className="text-[15px] font-semibold text-ink">
              How can we help?
            </h2>
            <p className="max-w-xs text-[13px] text-ink-muted">
              Ask about orders, tickets, policies, product limits, or an
              escalation for the selected account.
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <Message message={message} key={`${message.role}-${index}`} />
        ))}

        {loading && <TypingIndicator />}

        <div ref={endRef} />
      </div>
    </section>
  );
}
