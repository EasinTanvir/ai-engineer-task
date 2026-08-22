"use client";

import { AlertCircle, Send } from "lucide-react";

export function Composer({
  draft,
  onDraftChange,
  onSubmit,
  sessionReady,
  loading,
  error,
}) {
  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <div className="shrink-0 border-t border-border bg-surface">
      <div className="mx-auto w-full max-w-3xl px-4 py-3 sm:px-6">
        {error && (
          <p
            role="alert"
            className="mb-2 flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[12.5px] font-medium text-red-700"
          >
            <AlertCircle size={14} />
            {error}
          </p>
        )}
        <form onSubmit={onSubmit} className="flex items-end gap-2">
          <label className="sr-only" htmlFor="chat-message">
            Message
          </label>
          <textarea
            id="chat-message"
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              sessionReady
                ? "Ask a support question…"
                : "Starting account session…"
            }
            rows="1"
            disabled={!sessionReady || loading}
            className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-border bg-canvas px-3.5 py-2.5 text-[14px] text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!draft.trim() || !sessionReady || loading}
            className="flex h-[42px] shrink-0 items-center gap-1.5 rounded-xl bg-accent px-4 text-[13.5px] font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send size={15} />
            <span className="hidden sm:inline">
              {loading ? "Sending…" : "Send"}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
