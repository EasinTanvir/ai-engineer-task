"use client";

import { Bot, ChevronRight, Flag, User } from "lucide-react";
import { summarizeToolCall } from "@/lib/chat";
import { MarkdownContent } from "./Markdowncontent";

function ToolTrace({ calls }) {
  if (!calls?.length) return null;
  return (
    <details className="group mt-2">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-medium text-ink-muted transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
        <ChevronRight
          size={12}
          className="shrink-0 transition-transform duration-150 group-open:rotate-90"
        />
        Tools used ({calls.length})
      </summary>
      <ul className="mt-2 space-y-1.5 border-l border-border pl-3">
        {calls.map((call, index) => (
          <li key={`${call.name}-${index}`}>
            <div className="flex items-center gap-1.5 font-mono-data text-[11px] font-medium text-ink">
              <span aria-hidden="true">🔧</span>
              {summarizeToolCall(call)}
            </div>
            <pre className="mt-1 max-w-full overflow-x-auto rounded-md bg-surface-muted p-2 font-mono-data text-[10.5px] leading-relaxed text-ink-muted">
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

export function Message({ message }) {
  const isUser = message.role === "user";
  const isProposal =
    message.role === "assistant" &&
    (message.toolCalls?.some((call) => call.name === "propose_escalation") ||
      /yes,?\s*confirm/i.test(message.content));

  return (
    <article
      className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : "flex-row"} animate-msg-in`}
    >
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-accent-soft text-accent" : "bg-accent text-white"
        }`}
        aria-hidden="true"
      >
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>

      <div
        className={`flex max-w-[85%] flex-col sm:max-w-[70%] ${isUser ? "items-end" : "items-start sm:max-w-[85%]"}`}
      >
        <span className="mb-1 px-1 text-[11px] font-medium text-ink-muted">
          {isUser ? "You" : "ParcelPilot Support"}
        </span>

        {isProposal && (
          <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-md border border-flag/30 bg-flag-soft px-2 py-1 text-[11px] font-medium text-flag">
            <Flag size={12} />
            Confirmation required — reply “yes, confirm” to create a real
            escalation.
          </div>
        )}

        {isUser ? (
          <div className="whitespace-pre-wrap rounded-2xl rounded-br-sm bg-accent px-4 py-2.5 text-[14px] leading-relaxed text-white">
            {message.content}
          </div>
        ) : (
          <div className="w-full rounded-2xl rounded-bl-sm border border-border bg-surface px-4 py-3">
            <MarkdownContent content={message.content} />
          </div>
        )}

        {!isUser && <ToolTrace calls={message.toolCalls} />}
      </div>
    </article>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-white"
        aria-hidden="true"
      >
        <Bot size={14} />
      </div>
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-border bg-surface px-4 py-3">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-muted [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-muted [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-muted" />
      </div>
    </div>
  );
}
