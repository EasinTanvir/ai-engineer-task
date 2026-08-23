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
              Hosting and Api Limitation
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
        <div className="space-y-4 text-sm leading-6 text-slate-600">
          <div>
            <p className="font-semibold text-slate-900">Hosting limitation</p>
            <p>
              This app is currently hosted on Vercel. Vercel builds serverless
              functions, which can fail to include the native dependency this
              app's local embedding model needs. If a request fails
              unexpectedly, this is the likely cause - not a bug in the
              application. A VPS or any host running a persistent Node process
              would not have this issue.
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Groq API limit</p>
            <p>
              Chat responses use the Groq free-tier API. If responses stop
              returning, the free tier's rate limit has likely been reached for
              the moment.
            </p>
          </div>
          <p className="rounded-lg bg-slate-50 p-3 text-slate-700">
            <strong>Recommended:</strong> if something doesn't work here, please
            run the project locally - set your own{" "}
            <code className="rounded bg-slate-200 px-1 py-0.5 text-xs">
              GROQ_API_KEY
            </code>{" "}
            in{" "}
            <code className="rounded bg-slate-200 px-1 py-0.5 text-xs">
              .env
            </code>{" "}
            and follow the setup steps in the repo README.
          </p>
        </div>
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
