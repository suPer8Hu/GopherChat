"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import { useI18n } from "@/components/LanguageProvider";
import LanguageToggle from "@/components/LanguageToggle";

const PAGE_SIZE = 20;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const STREAM_FIRST_CHUNK_TIMEOUT_MS = 8000;
//set it to 50 to test if the stream can turn it in async mode
// const STREAM_FIRST_CHUNK_TIMEOUT_MS = 50; 
const ASYNC_POLL_INTERVAL_MS = 1000;
type Me = { id: number; email: string; username: string };

type ChatMessage = {
  id: number;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

type ListMessagesResp = {
  messages: ChatMessage[];
  next_before_id: number | null;
};

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sidFromUrl = searchParams.get("session_id");
  const { t } = useI18n();

  const [me, setMe] = useState<Me | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nextBeforeId, setNextBeforeId] = useState<number | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [responseMode, setResponseMode] = useState<"full" | "stream">("full");
  const [streamingText, setStreamingText] = useState("");
  const [streaming, setStreaming] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [errorDismissed, setErrorDismissed] = useState(false);

  const streamAbort = useRef<AbortController | null>(null);
  const pollTimer = useRef<number | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const authed = useMemo(() => Boolean(getToken()), []);

  function mergeUniqueById(prev: ChatMessage[], incoming: ChatMessage[]) {
    const map = new Map<number, ChatMessage>();
    for (const m of prev) map.set(m.id, m);
    for (const m of incoming) map.set(m.id, m);

    // Sort: oldest first so latest appears at bottom
    return Array.from(map.values()).sort((a, b) => a.id - b.id);
  }

  async function fetchMessages(opts: {
    sid: string;
    beforeId?: number;
    replace?: boolean;
  }) {
    const { sid, beforeId, replace } = opts;

    const params = new URLSearchParams();
    params.set("limit", String(PAGE_SIZE));
    if (beforeId) params.set("before_id", String(beforeId));

    const qs = `?${params.toString()}`;
    const data = await apiFetch<ListMessagesResp>(
      `/chat/sessions/${sid}/messages${qs}`,
      {
        auth: true,
      },
    );

    setNextBeforeId(data.next_before_id ?? null);

    const ordered = (data.messages ?? []).slice().sort((a, b) => a.id - b.id);
    if (replace) {
      setMessages(ordered);
    } else {
      setMessages((prev) => mergeUniqueById(prev, ordered));
    }
  }

  async function refreshMessages(sid: string) {
    setRefreshing(true);
    try {
      await fetchMessages({ sid, replace: true });
    } finally {
      setRefreshing(false);
    }
  }

  async function loadOlderMessages() {
    if (!sessionId) return;
    if (!nextBeforeId) return;

    setLoadingOlder(true);
    try {
      await fetchMessages({
        sid: sessionId,
        beforeId: nextBeforeId,
        replace: false,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("chat.loadOlderFailed"));
    } finally {
      setLoadingOlder(false);
    }
  }

  useEffect(() => {
    if (!authed) {
      router.replace("/login");
      return;
    }
    apiFetch<Me>("/me", { auth: true })
      .then(setMe)
      .catch((e) => setError(e?.message ?? t("chat.loadMeFailed")));
  }, [authed, router, t]);

  // Use session_id from URL (so refresh keeps the same session),
  // otherwise create a new session and persist it into the URL.
  useEffect(() => {
    if (!authed) return;

    if (!sidFromUrl) {
      setSessionId(null);
      setMessages([]);
      setNextBeforeId(null);
      return;
    }

    setSessionId(sidFromUrl);
    refreshMessages(sidFromUrl).catch((e) =>
      setError(e?.message ?? t("chat.loadMessagesFailed")),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, sidFromUrl]);

  useEffect(() => {
    return () => {
      if (streamAbort.current) streamAbort.current.abort();
      if (pollTimer.current) window.clearInterval(pollTimer.current);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streamingText, streaming]);

  async function sendFullMessage(sid: string, msg: string) {
    await apiFetch<{ reply: string; message_id: number }>("/chat/messages", {
      method: "POST",
      auth: true,
      body: JSON.stringify({ session_id: sid, message: msg }),
    });
    await refreshMessages(sid);
  }

  async function startPolling(jobId: string, sid: string) {
    if (pollTimer.current) window.clearInterval(pollTimer.current);

    pollTimer.current = window.setInterval(async () => {
      try {
        const data = await apiFetch<{ job: { status: string; error?: string | null } }>(
          `/chat/jobs/${jobId}`,
          { auth: true }
        );
        if (data.job.status === "succeeded") {
          if (pollTimer.current) window.clearInterval(pollTimer.current);
          pollTimer.current = null;
          await refreshMessages(sid);
        } else if (data.job.status === "failed") {
          if (pollTimer.current) window.clearInterval(pollTimer.current);
          pollTimer.current = null;
          setError(data.job.error || t("chat.asyncFailed"));
        }
      } catch (e) {
        // ignore transient errors
      }
    }, ASYNC_POLL_INTERVAL_MS);
  }

  async function sendAsyncMessage(sid: string, msg: string, idemKey: string) {
    const data = await apiFetch<{ job_id: string }>("/chat/messages/async", {
      method: "POST",
      auth: true,
      headers: { "Idempotency-Key": idemKey },
      body: JSON.stringify({ session_id: sid, message: msg }),
    });
    refreshMessages(sid).catch(() => {});
    await startPolling(data.job_id, sid);
  }

  async function sendStreamMessage(sid: string, msg: string, idemKey: string) {
    if (!API_BASE_URL) {
      throw new Error(t("chat.missingApiBase"));
    }
    const token = getToken();
    if (!token) throw new Error(t("chat.notAuthed"));

    if (streamAbort.current) streamAbort.current.abort();
    const controller = new AbortController();
    streamAbort.current = controller;

    let gotChunk = false;
    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      if (!gotChunk) {
        timedOut = true;
        controller.abort();
      }
    }, STREAM_FIRST_CHUNK_TIMEOUT_MS);

    const res = await fetch(`${API_BASE_URL}/chat/messages/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "Idempotency-Key": idemKey,
      },
      body: JSON.stringify({ session_id: sid, message: msg }),
      signal: controller.signal,
    });

    if (!res.ok || !res.body) {
      const text = await res.text();
      window.clearTimeout(timeoutId);
      const err = new Error(text || `HTTP ${res.status}`);
      (err as any).gotChunk = gotChunk;
      (err as any).timedOut = timedOut;
      throw err;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let doneEvent = false;

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
          if (!gotChunk) {
            gotChunk = true;
            window.clearTimeout(timeoutId);
          }
          setStreamingText((prev) => prev + delta);
        }
      } else if (event === "error" || payload.type === "error") {
        const msgText = payload.message || t("chat.streamError");
        const err = new Error(msgText);
        (err as any).gotChunk = gotChunk;
        (err as any).timedOut = timedOut;
        throw err;
      } else if (event === "done" || payload.type === "done") {
        doneEvent = true;
      }
    };

    try {
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
    } catch (e) {
      const err = e instanceof Error ? e : new Error(t("chat.streamFailed"));
      (err as any).gotChunk = gotChunk;
      (err as any).timedOut = timedOut;
      window.clearTimeout(timeoutId);
      throw err;
    }

    window.clearTimeout(timeoutId);
    if (doneEvent) await refreshMessages(sid);
  }

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    const msg = input.trim();
    if (!msg) return;

    setSending(true);
    setError(null);
    setErrorDismissed(false);
    setInput("");
    setStreamingText("");

    try {
      let sid = sessionId;
      if (!sid) {
        try {
          const data = await apiFetch<{ session_id: string }>("/chat/sessions", {
            method: "POST",
            auth: true,
            body: JSON.stringify({}),
          });
          sid = data.session_id;
          setSessionId(sid);
          const nextQuery = new URLSearchParams(Array.from(searchParams.entries()));
          nextQuery.set("session_id", sid);
          router.replace(`/chat?${nextQuery.toString()}`);
          window.dispatchEvent(new Event("chat:sessions:refresh"));
        } catch (e) {
          setError(e instanceof Error ? e.message : t("chat.createSessionFailed"));
          return;
        }
      }
      const idemKey =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;

      if (responseMode === "stream") {
        setStreaming(true);
        try {
          await sendStreamMessage(sid, msg, idemKey);
        } catch (e) {
          const gotChunk = Boolean((e as any)?.gotChunk);
          const timedOut = Boolean((e as any)?.timedOut);
          if (!gotChunk || timedOut) {
            await sendAsyncMessage(sid, msg, idemKey);
          } else {
            throw e;
          }
        }
      } else {
        try {
          await sendFullMessage(sid, msg);
        } catch (e) {
          await sendAsyncMessage(sid, msg, idemKey);
        }
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("chat:sessions:refresh"));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("chat.sendFailed"));
    } finally {
      setStreaming(false);
      setSending(false);
    }
  }

  return (
    <div className="h-[100dvh] p-4 pt-16 md:p-6 md:pt-16 flex flex-col overflow-hidden relative">
      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        <LanguageToggle floating={false} />
        <button
          className="border rounded px-3 py-1"
          onClick={() => {
            clearToken();
            router.push("/login");
          }}
        >
          {t("chat.logout")}
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">{t("chat.title")}</h1>
          <p className="text-sm text-white/70 break-all sm:truncate">
            {me ? t("chat.signedInAs", { email: me.email }) : t("chat.loadingUser")}{" "}
            {sessionId ? "" : t("chat.sessionCreating")}
          </p>
        </div>
      </div>

      {error && !errorDismissed ? (
        <div className="mt-4 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">{t("chat.deliveryFailed")}</div>
              <div className="mt-1 text-xs text-red-100/80">
                {t("chat.deliveryFailedDesc")}
              </div>
            </div>
            <button
              className="rounded px-2 py-1 text-xs text-red-100/70 hover:text-red-100"
              onClick={() => setErrorDismissed(true)}
              type="button"
              aria-label={t("common.dismiss")}
            >
              ×
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex-1 overflow-auto pr-1">
        <div className="grid gap-4 pb-6">
          <div className="border border-white/10 rounded p-4 bg-white/5 text-white backdrop-blur shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{t("chat.messages")}</div>
              <div className="flex items-center gap-2">
                <button
                  className="text-sm border border-white/15 rounded px-2 py-1 text-white/80 disabled:opacity-50 hover:bg-white/10"
                  onClick={() => (sessionId ? refreshMessages(sessionId) : null)}
                  disabled={!sessionId || refreshing}
                  type="button"
                >
                  {refreshing ? t("sessions.loading") : t("chat.refresh")}
                </button>
              </div>
            </div>

            {!sessionId ? (
              <p className="mt-4 text-sm text-white/70">
                {t("chat.selectSession")}
              </p>
            ) : null}

            <div className="mt-3 flex items-center justify-between">
              <button
                className="text-sm border border-white/15 rounded px-2 py-1 text-white/80 disabled:opacity-50 hover:bg-white/10"
                onClick={loadOlderMessages}
                disabled={!sessionId || !nextBeforeId || loadingOlder}
                type="button"
                title={!nextBeforeId ? t("chat.noMoreHistory") : t("chat.loadOlder")}
              >
                {loadingOlder
                  ? t("sessions.loading")
                  : nextBeforeId
                    ? t("chat.loadOlder")
                    : t("chat.noMoreHistory")}
              </button>

              {nextBeforeId ? (
                <span className="text-xs text-white/50">
                  next_before_id={nextBeforeId}
                </span>
              ) : (
                <span className="text-xs text-white/50">{t("chat.endHistory")}</span>
              )}
            </div>

            <div className="mt-5 space-y-5">
              {messages.length === 0 ? (
                <p className="text-base text-white/70">{t("chat.noMessages")}</p>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className="max-w-[80%]">
                      <div
                        className={`text-xs text-white/50 ${
                          m.role === "user" ? "text-right" : "text-left"
                        }`}
                      >
                        #{m.id} · {m.role} · {new Date(m.created_at).toLocaleString()}
                      </div>
                      <div
                        className={`mt-2 whitespace-pre-wrap rounded-2xl px-4 py-3 text-base leading-7 shadow-sm ${
                          m.role === "user"
                            ? "bg-emerald-300/90 text-slate-900"
                            : "bg-white/10 text-white border border-white/10"
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {streaming ? (
                <div className="flex justify-start">
                  <div className="max-w-[80%]">
                    <div className="text-xs text-white/50">{t("chat.streaming")}</div>
                    <div className="mt-2 whitespace-pre-wrap rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-base leading-7 text-white shadow-sm">
                      {streamingText || "…"}
                    </div>
                  </div>
                </div>
              ) : null}
              <div ref={bottomRef} />
            </div>
          </div>

        </div>
      </div>

      <div className="pt-4">
        <form
          onSubmit={onSend}
          className="border border-white/15 rounded p-4 bg-white/10 text-white backdrop-blur shadow-[0_-10px_30px_rgba(0,0,0,0.25)]"
        >
          <label className="block text-sm font-medium">{t("chat.send")}</label>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-xs font-medium text-white/60">{t("chat.responseMode")}</span>
            <div className="inline-flex rounded border border-white/15 p-0.5">
              <button
                type="button"
                className={`rounded px-2 py-1 ${
                  responseMode === "full" ? "bg-white text-slate-900" : "text-white/70"
                }`}
                onClick={() => setResponseMode("full")}
              >
                {t("chat.full")}
              </button>
              <button
                type="button"
                className={`rounded px-2 py-1 ${
                  responseMode === "stream" ? "bg-white text-slate-900" : "text-white/70"
                }`}
                onClick={() => setResponseMode("stream")}
              >
                {t("chat.stream")}
              </button>
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            <input
              className="flex-1 rounded border border-white/15 bg-white/5 px-3 py-2 text-white placeholder:text-white/40"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("chat.typeMessage")}
              disabled={sending}
            />
            <Link
              className="rounded border border-white/20 px-3 py-2 text-xs text-white/80 hover:text-white"
              href="/vision"
            >
              {t("vision.openPage")}
            </Link>
            <button
              className="rounded bg-white text-slate-900 px-4 py-2 disabled:opacity-50"
              type="submit"
              disabled={sending}
            >
              {sending
                ? responseMode === "stream"
                  ? t("chat.streamingState")
                  : t("chat.sendingState")
                : t("chat.send")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
