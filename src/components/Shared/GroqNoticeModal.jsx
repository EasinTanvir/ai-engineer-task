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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-4 backdrop-blur-sm sm:py-6"
      role="presentation"
    >
      <div
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-h-[calc(100vh-3rem)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="groq-notice-title"
      >
        {/* Header */}
        <div className="shrink-0 border-b border-slate-100 bg-slate-50/80 px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-blue-700 sm:text-xs">
                Demo Environment
              </p>

              <h2
                id="groq-notice-title"
                className="text-lg font-bold tracking-tight text-slate-950 sm:text-xl"
              >
                A quick note about the live demo
              </h2>
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setIsOpen(false)}
              className="shrink-0 rounded-lg p-1.5 text-2xl leading-none text-slate-400 transition hover:bg-slate-200 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              aria-label="Close demo notice"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          <div className="space-y-5 text-sm leading-6 text-slate-600">
            <div>
              <p className="mb-1.5 font-semibold text-slate-900">
                Hosting environment
              </p>

              <p>
                For this assessment, the application is currently deployed on
                Vercel using its free hosting tier. I do not currently have a
                dedicated VPS available for the live demo, so the production
                deployment is running within Vercel&apos;s serverless
                environment.
              </p>
            </div>

            <div>
              <p className="mb-1.5 font-semibold text-slate-900">
                AI model & API availability
              </p>

              <p>
                The application uses a Groq-hosted model for AI responses.
                Because the live deployment relies on the Groq free tier, API
                rate limits may occasionally be reached, particularly when
                multiple requests are made within a short period.
              </p>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
              <p className="mb-1.5 font-semibold text-blue-950">
                Why you may occasionally see an error
              </p>

              <p className="text-blue-900/80">
                Some parts of the application are better suited to a persistent
                Node.js/VPS environment than a serverless deployment. As a
                result, an occasional failure in the live demo may be caused by
                hosting or free-tier resource limitations rather than the
                application logic itself.
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="mb-1.5 font-semibold text-slate-900">
                Recommended for full evaluation
              </p>

              <p>
                For the most reliable experience, I recommend running the
                project locally using the setup instructions provided in the
                repository README.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-4 sm:px-6 sm:py-5">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
          >
            Continue to Demo
          </button>
        </div>
      </div>
    </div>
  );
}
