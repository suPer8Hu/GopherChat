"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import FlowBackground from "@/components/FlowBackground";
import { ApiError, type DemoMessage } from "@/lib/api";
import { useI18n } from "@/components/LanguageProvider";
import LanguageToggle from "@/components/LanguageToggle";
import CapsuleMessage from "@/components/CapsuleMessage";

export default function DemoPage() {
  const { t } = useI18n();
  const [messages, setMessages] = useState<DemoMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const streamAbort = useRef<AbortController | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

  const hint = useMemo(() => t("demo.hint"), [t]);
  const scrollToBottom = () => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  async function sendStream(nextMessages: DemoMessage[]) {
    if (!API_BASE_URL) {
      throw new Error(t("chat.missingApiBase"));
    }
    if (streamAbort.current) streamAbort.current.abort();
    const controller = new AbortController();
    streamAbort.current = controller;

    const res = await fetch(`${API_BASE_URL}/demo/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: nextMessages }),
      signal: controller.signal,
    });

    if (!res.ok || !res.body) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let doneEvent = false;
    let accum = "";

    const handleEvent = (event: string, data: string) => {
      if (!data) return;
      let payload: any = null;
      try {
        payload = JSON.parse(data);
      } catch {
        return;
      }
      if (event === "chunk" || payload.type === "chunk") {
        const delta = typeof payload.delta === "string" ? payload.delta : "";
        if (delta) {
          accum += delta;
          setStreamingText(accum);
          requestAnimationFrame(() => scrollToBottom());
        }
      } else if (event === "error" || payload.type === "error") {
        const msgText = payload.message || t("demo.failed");
        throw new Error(msgText);
      } else if (event === "done" || payload.type === "done") {
        doneEvent = true;
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        const lines = part.split("\n");
        let event = "";
        let data = "";
        for (const line of lines) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          if (line.startsWith("data:")) data += line.slice(5).trim();
        }
        handleEvent(event, data);
      }
    }

    return doneEvent ? accum.trim() : accum.trim();
  }

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending || streaming) return;
    setError(null);
    setInput("");

    const nextMessages = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setSending(true);
    setStreaming(true);
    setStreamingText("");

    try {
      const reply = await sendStream(nextMessages);
      if (reply) setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("demo.failed"));
    } finally {
      setSending(false);
      setStreaming(false);
      setStreamingText("");
      requestAnimationFrame(() => scrollToBottom());
    }
  }

  return (
    <FlowBackground>
      <style>{`
        @keyframes demoDotPulse {
          0% { transform: translateY(0); opacity: 0.35; }
          30% { transform: translateY(-4px); opacity: 1; }
          60% { transform: translateY(0); opacity: 0.6; }
          100% { transform: translateY(0); opacity: 0.35; }
        }
      `}</style>
      <div className="min-h-screen px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">{t("demo.title")}</h1>
              <p className="mt-1 text-xs text-white/70">{hint}</p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Link className="underline" href="/">
                {t("demo.backHome")}
              </Link>
              <Link className="underline" href="/login">
                {t("demo.login")}
              </Link>
              <LanguageToggle floating={false} />
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div ref={listRef} className="max-h-[60vh] overflow-y-auto space-y-4 pr-1">
              {messages.length === 0 ? (
                <div className="text-sm text-white/60">{t("demo.empty")}</div>
              ) : (
                messages.map((m, idx) => (
                  <div
                    key={`${m.role}-${idx}`}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className="max-w-[80%]">
                      {m.role === "user" ? (
                        <div className="mt-1 inline-block max-w-full whitespace-pre-wrap rounded-2xl bg-emerald-300/90 px-4 py-3 text-base leading-7 text-slate-900 shadow-sm">
                          {m.content}
                        </div>
                      ) : (
                        <div className="mt-1">
                          <CapsuleMessage content={m.content} />
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              {streaming ? (
                <div className="flex justify-start">
                  <div className="max-w-[80%]">
                    <div className="mt-1 inline-block max-w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white shadow-sm">
                      {streamingText ? (
                        <span className="whitespace-pre-wrap">{streamingText}</span>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            {[0, 1, 2].map((i) => (
                              <span
                                key={i}
                                className="h-2 w-2 rounded-full bg-emerald-200/90"
                                style={{ animation: `demoDotPulse 1s ${i * 0.15}s infinite` }}
                              />
                            ))}
                          </div>
                          <div className="text-xs text-white/70">{t("demo.thinking")}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {error ? (
              <div className="mt-4 rounded border border-rose-200/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {error}
              </div>
            ) : null}

            <form onSubmit={onSend} className="mt-4 flex gap-2">
              <input
                className="flex-1 rounded border border-white/15 bg-white/5 px-3 py-2 text-white placeholder:text-white/40"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t("demo.placeholder")}
                disabled={sending || streaming}
              />
              <button
                className="rounded bg-white px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50"
                type="submit"
                disabled={sending || streaming || !input.trim()}
              >
                {sending || streaming ? t("demo.sending") : t("demo.send")}
              </button>
            </form>
          </div>
        </div>
      </div>
    </FlowBackground>
  );
}
