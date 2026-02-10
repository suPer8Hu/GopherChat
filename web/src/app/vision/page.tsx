"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import FlowBackground from "@/components/FlowBackground";
import { ApiError, recognizeImage, type VisionPrediction } from "@/lib/api";
import { useI18n } from "@/components/LanguageProvider";
import LanguageToggle from "@/components/LanguageToggle";

export default function VisionPage() {
  const { t, lang } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [topK, setTopK] = useState(3);
  const [results, setResults] = useState<VisionPrediction[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [askError, setAskError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [showVlmNotice, setShowVlmNotice] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const acceptedTypes = useMemo(() => "image/jpeg,image/png,image/gif", []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError(t("vision.noFile"));
      return;
    }
    setSubmitting(true);
    setError(null);
    setResults(null);
    try {
      const data = await recognizeImage(file, topK);
      setResults(data.predictions ?? []);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t("vision.error");
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function onAsk(e: React.FormEvent) {
    e.preventDefault();
    setAskError(null);
    setAnswer(null);
    setShowVlmNotice(true);
  }

  return (
    <FlowBackground>
      <div className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">{t("vision.title")}</h1>
              <p className="mt-1 text-sm text-white/70">{t("vision.subtitle")}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link className="text-sm underline" href="/chat">
                {t("vision.backChat")}
              </Link>
              <LanguageToggle floating={false} />
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <form
              onSubmit={onSubmit}
              className="rounded-xl bg-white/95 p-6 text-slate-900 shadow-xl shadow-slate-900/20"
            >
              <label className="text-sm font-semibold">{t("vision.upload")}</label>
              <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
                <input
                  type="file"
                  accept={acceptedTypes}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-slate-700 file:mr-4 file:rounded file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
                />
                <p className="mt-2 text-xs text-slate-500">{t("vision.supported")}</p>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label className="text-sm font-medium">{t("vision.topK")}</label>
                <select
                  className="rounded border border-slate-300 px-3 py-2 text-sm"
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                >
                  <option value={1}>Top-1</option>
                  <option value={3}>Top-3</option>
                  <option value={5}>Top-5</option>
                </select>
                <button
                  type="submit"
                  className="ml-auto rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  disabled={submitting || !file}
                >
                  {submitting ? t("vision.recognizing") : t("vision.recognize")}
                </button>
              </div>

              {error ? (
                <div className="mt-4 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}
            </form>

            <div className="space-y-4">
              <div className="rounded-xl bg-white/10 p-4 text-white">
                <div className="text-sm font-semibold">{t("vision.preview")}</div>
                <div className="mt-3 flex h-48 items-center justify-center rounded-lg border border-dashed border-white/30 bg-white/5">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="preview"
                      className="h-full w-full rounded-lg object-contain"
                    />
                  ) : (
                    <span className="text-xs text-white/60">{t("vision.noPreview")}</span>
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-white/10 p-4 text-white">
                <div className="text-sm font-semibold">{t("vision.results")}</div>
                {results && results.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {results.map((item) => {
                      const label = lang === "zh" && item.label_zh ? item.label_zh : item.label;
                      return (
                        <div
                          key={`${item.index}-${item.label}`}
                          className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm"
                        >
                          <div className="font-medium">{label}</div>
                          <div className="text-xs text-white/70">
                            {t("vision.score")}: {(item.score * 100).toFixed(2)}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-white/60">{t("vision.noResults")}</p>
                )}
              </div>

              <form onSubmit={onAsk} className="rounded-xl bg-white/10 p-4 text-white">
                <div className="text-sm font-semibold">{t("vision.askTitle")}</div>
                <textarea
                  className="mt-3 h-24 w-full rounded border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={t("vision.askPlaceholder")}
                />
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="submit"
                    className="rounded bg-white px-3 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50"
                    disabled={asking || !file}
                  >
                    {asking ? t("vision.asking") : t("vision.ask")}
                  </button>
                  {askError ? (
                    <span className="text-xs text-rose-300">{askError}</span>
                  ) : null}
                </div>
                <div className="mt-3 min-h-[60px] rounded border border-white/10 bg-white/5 p-3 text-sm text-white/90">
                  {answer ? answer : <span className="text-white/50">{t("vision.noAnswer")}</span>}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {showVlmNotice ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
          onClick={() => setShowVlmNotice(false)}
        >
          <div
            className="w-full max-w-sm rounded-lg border border-white/15 bg-slate-950/90 p-4 text-white shadow-xl backdrop-blur"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-semibold">{t("vision.vlmUnavailableTitle")}</div>
            <p className="mt-2 text-xs text-white/70">{t("vision.vlmUnavailableDesc")}</p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                className="rounded border border-white/15 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
                type="button"
                onClick={() => setShowVlmNotice(false)}
              >
                {t("common.close")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </FlowBackground>
  );
}
