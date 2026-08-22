"use client";

import { ACCOUNTS } from "@/lib/chat";

export function ChatHeader({
  accountId,
  onAccountChange,
  sessionReady,
  loading,
}) {
  return (
    <header className="shrink-0 border-b border-border bg-surface">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
            ParcelPilot
          </p>
          <h1 className="text-lg font-semibold leading-tight text-ink">
            Customer Support
          </h1>
          <p className="text-[12.5px] text-ink-muted"></p>
        </div>

        <label className="flex items-center gap-2 self-start rounded-full border border-border bg-canvas py-1 pl-3 pr-1.5 sm:self-auto">
          <span className="text-[11px] font-medium text-ink-muted">
            Signed in as
          </span>
          <select
            value={accountId}
            onChange={(event) => onAccountChange(event.target.value)}
            disabled={loading}
            className="rounded-full bg-transparent py-1 pl-1 pr-2 text-[13px] font-medium text-ink outline-none disabled:opacity-50"
          >
            {ACCOUNTS.map((account) => (
              <option value={account.id} key={account.id}>
                {account.name} ({account.id})
              </option>
            ))}
          </select>
        </label>
      </div>
    </header>
  );
}
