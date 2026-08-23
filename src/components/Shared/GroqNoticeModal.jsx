"use client";

import { useEffect, useRef, useState } from "react";

export function GroqNoticeModal() {
  const [isOpen, setIsOpen] = useState(true);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6"
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="groq-notice-title"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-700">
              Service notice
            </p>
            <h2 id="groq-notice-title" className="text-xl font-bold">
              Powered by Groq free API
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-2 text-2xl leading-none text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            aria-label="Close service notice"
          >
            &times;
          </button>
        </div>
        <p className="text-sm leading-6 text-slate-600">
          This demo uses the Groq free API. If responses stop working, the free
          tier's rate limit has likely been reached for the moment.
        </p>
        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">
          <strong>If you're evaluating this project:</strong> set your own key
          as{" "}
          <code className="rounded bg-slate-200 px-1 py-0.5 text-xs">
            GROQ_API_KEY
          </code>{" "}
          in the{" "}
          <code className="rounded bg-slate-200 px-1 py-0.5 text-xs">.env</code>{" "}
          file (see the repo README for setup steps) to continue testing.
        </p>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="mt-6 w-full rounded-lg bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:ring-offset-2"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
