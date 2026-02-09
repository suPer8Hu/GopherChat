"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { setToken } from "@/lib/auth";
import FlowBackground from "@/components/FlowBackground";
import { useI18n } from "@/components/LanguageProvider";

type RegisterResponse = {
  id: number;
  email: string;
  username: string;
  token: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function sendCaptcha() {
    const emailTrim = email.trim();
    if (!emailTrim) {
      setError(t("register.emailRequired"));
      return;
    }
    setSending(true);
    setError(null);
    try {
      await apiFetch<{ sent: boolean }>("/captcha", {
        method: "POST",
        body: JSON.stringify({ email: emailTrim }),
      });
      setCooldown(60);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("register.sendFailed"));
    } finally {
      setSending(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const emailTrim = email.trim();
    if (!emailTrim || !captcha.trim() || !password) {
      setError(t("register.required"));
      return;
    }
    if (password !== confirm) {
      setError(t("register.passwordsMismatch"));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const data = await apiFetch<RegisterResponse>("/users", {
        method: "POST",
        body: JSON.stringify({
          email: emailTrim,
          captcha: captcha.trim(),
          password,
        }),
      });
      setToken(data.token);
      router.push("/chat");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("register.failed"));
    } finally {
      setSubmitting(false);
    }
  }

  const sendLabel =
    cooldown > 0
      ? t("register.resendIn", { seconds: cooldown })
      : sending
        ? t("register.sending")
        : t("register.sendCode");

  return (
    <FlowBackground>
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md border rounded-lg p-6 bg-white text-slate-900 shadow-xl shadow-emerald-500/10">
          <h1 className="text-xl font-semibold">{t("register.title")}</h1>

          <form className="mt-4 space-y-3" onSubmit={onSubmit}>
            <div>
              <label className="block text-sm font-medium">{t("register.email")}</label>
              <input
                className="mt-1 w-full border rounded px-3 py-2"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium">{t("register.captcha")}</label>
              <div className="mt-1 flex gap-2">
                <input
                  className="flex-1 border rounded px-3 py-2"
                  value={captcha}
                  onChange={(e) => setCaptcha(e.target.value)}
                  inputMode="numeric"
                  required
                />
                <button
                  type="button"
                  className="border rounded px-3 py-2 text-sm disabled:opacity-50"
                  onClick={sendCaptcha}
                  disabled={sending || cooldown > 0 || !email.trim()}
                >
                  {sendLabel}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">{t("register.codeExpires")}</p>
            </div>

            <div>
              <label className="block text-sm font-medium">{t("register.password")}</label>
              <input
                className="mt-1 w-full border rounded px-3 py-2"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium">{t("register.confirmPassword")}</label>
              <input
                className="mt-1 w-full border rounded px-3 py-2"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <button
              className="w-full rounded bg-black text-white py-2 disabled:opacity-50"
              disabled={submitting}
              type="submit"
            >
              {submitting ? t("register.creating") : t("register.createAccount")}
            </button>
          </form>

          <p className="mt-4 text-sm">
            {t("register.haveAccount")}{" "}
            <Link className="underline" href="/login">
              {t("register.login")}
            </Link>
          </p>
        </div>
      </div>
    </FlowBackground>
  );
}
