"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { setToken } from "@/lib/auth";
import Link from "next/link";
import FlowBackground from "@/components/FlowBackground";
import { useI18n } from "@/components/LanguageProvider";


type LoginResponse = { token: string };

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailOptions, setEmailOptions] = useState<string[]>([]);
  const [emailOpen, setEmailOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadEmailOptions() {
    const raw = window.localStorage.getItem("remembered_emails");
    if (!raw) {
      const legacy = window.localStorage.getItem("remembered_email");
      setEmailOptions(legacy ? [legacy] : []);
      return;
    }
    try {
      const list = JSON.parse(raw) as string[];
      setEmailOptions(Array.isArray(list) ? list : []);
    } catch {
      setEmailOptions([]);
    }
  }

  function handleEmailFocus() {
    setEmailOpen(true);
    loadEmailOptions();
  }

  function handleEmailBlur() {
    setTimeout(() => setEmailOpen(false), 100);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const data = await apiFetch<LoginResponse>("/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const normalized = email.trim();
      if (normalized) {
        let list: string[] = [];
        try {
          const raw = window.localStorage.getItem("remembered_emails");
          list = raw ? (JSON.parse(raw) as string[]) : [];
        } catch {
          list = [];
        }
        const next = [normalized, ...list.filter((v) => v !== normalized)].slice(0, 10);
        window.localStorage.setItem("remembered_emails", JSON.stringify(next));
      }
      setToken(data.token);
      router.push("/chat");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("login.failed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FlowBackground>
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md border rounded-lg p-6 bg-white text-slate-900 shadow-xl shadow-emerald-500/10">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">{t("login.title")}</h1>
            <Link className="text-xs underline" href="/">
              {t("login.home")}
            </Link>
          </div>

          <form className="mt-4 space-y-3" onSubmit={onSubmit}>
            <div>
              <label className="block text-sm font-medium">{t("login.email")}</label>
              <div className="relative">
                <input
                  className="mt-1 w-full border rounded px-3 py-2"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={handleEmailFocus}
                  onBlur={handleEmailBlur}
                  autoComplete="email"
                  required
                />
                {emailOpen && emailOptions.length > 0 ? (
                  <div className="absolute z-10 mt-1 w-full rounded border bg-white shadow">
                    {emailOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                        onMouseDown={() => setEmail(opt)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium">{t("login.password")}</label>
              <input
                className="mt-1 w-full border rounded px-3 py-2"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <button
              className="w-full rounded bg-black text-white py-2 disabled:opacity-50"
              disabled={submitting}
              type="submit"
            >
              {submitting ? t("login.loggingIn") : t("login.cta")}
            </button>
          </form>
          <div className="mt-4 flex items-center justify-between text-sm">
            <Link className="underline" href="/forgot">
              {t("login.forgot")}
            </Link>
            <span>
              {t("login.noAccount")}{" "}
              <Link className="underline" href="/register">
                {t("login.create")}
              </Link>
            </span>
          </div>
        </div>
      </div>
    </FlowBackground>
  );
}
