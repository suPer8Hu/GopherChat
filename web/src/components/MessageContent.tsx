"use client";

import { Children, isValidElement } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

type MessageContentProps = {
  content: string;
  className?: string;
  tone?: "assistant" | "user";
};

export default function MessageContent({ content, className, tone = "assistant" }: MessageContentProps) {
  return (
    <div className={`space-y-3 ${className ?? ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children }) => {
            const hasPre = Children.toArray(children).some(
              (child) => isValidElement(child) && child.type === "pre"
            );
            if (hasPre) {
              return <div className="space-y-3">{children}</div>;
            }
            return <p className="whitespace-pre-wrap text-base leading-7">{children}</p>;
          },
          ul: ({ children }) => (
            <ul className="list-disc space-y-1 pl-5 text-base leading-7">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal space-y-1 pl-5 text-base leading-7">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-7">{children}</li>,
          a: ({ children, href }) => (
            <a
              href={href}
              className="text-emerald-200 underline-offset-4 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-emerald-300/40 pl-3 text-white/80">
              {children}
            </blockquote>
          ),
          code: ({ inline, className, children }) => {
            const text = String(children ?? "");
            const isBlock = inline === false || !!className || text.includes("\n");
            if (!isBlock) {
              return (
                <code
                  className={`rounded bg-black/40 px-1.5 py-0.5 text-[0.85em] ${
                    tone === "user" ? "text-slate-900" : "text-emerald-100"
                  }`}
                >
                  {children}
                </code>
              );
            }
            const lang = (className || "").replace("language-", "");
            return (
              <pre className="max-w-full whitespace-pre-wrap break-words rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-xs text-emerald-100/90 shadow-sm">
                <code data-lang={lang}>{children}</code>
              </pre>
            );
          },
          pre: ({ children }) => <>{children}</>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
