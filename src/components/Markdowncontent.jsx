"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders assistant-authored markdown (headings, bold, lists, tables, links)
 * with styling that matches the chat's design tokens. Plain-text fallback
 * for anything not covered by the overrides below is handled by react-markdown
 * itself, so unknown nodes never crash the render.
 */
export function MarkdownContent({ content }) {
  return (
    <div className="chat-markdown text-[14px] leading-relaxed text-ink">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-2 mt-3 text-[16px] font-bold text-ink first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-3 text-[15px] font-bold text-ink first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-1.5 mt-3 text-[14px] font-bold text-ink first:mt-0">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="mb-2.5 last:mb-0">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-ink">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => (
            <ul className="mb-2.5 list-disc space-y-1 pl-5 last:mb-0">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2.5 list-decimal space-y-1 pl-5 last:mb-0">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-0.5">{children}</li>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-accent underline underline-offset-2 hover:text-accent-hover"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-2.5 border-l-2 border-border pl-3 text-ink-muted last:mb-0">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-3 border-border" />,
          code: ({ children }) => (
            <code className="rounded bg-surface-muted px-1 py-0.5 font-mono-data text-[12.5px] text-ink">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="mb-2.5 overflow-x-auto rounded-md bg-surface-muted p-2.5 font-mono-data text-[12.5px] leading-relaxed text-ink last:mb-0">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="mb-2.5 overflow-x-auto rounded-lg border border-border last:mb-0">
              <table className="w-full border-collapse text-left text-[12.5px]">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-surface-muted">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border-b border-border px-3 py-1.5 font-semibold text-ink">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-border px-3 py-1.5 align-top text-ink">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
