"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import FlowBackground from "@/components/FlowBackground";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function sendCaptcha() {
    const emailTrim = email.trim();
    if (!emailTrim) {
      setError("Email required");
      return;
    }
    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      await apiFetch<{ sent: boolean }>("/captcha", {
        method: "POST",
        body: JSON.stringify({ email: emailTrim }),
      });
      setCooldown(60);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send captcha");
    } finally {
      setSending(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const emailTrim = email.trim();
    if (!emailTrim || !captcha.trim() || !password) {
      setError("Email, captcha, and new password are required");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await apiFetch<{ updated: boolean }>("/password/reset", {
        method: "POST",
        body: JSON.stringify({
          email: emailTrim,
          captcha: captcha.trim(),
          new_password: password,
        }),
      });
      setSuccess("Password updated. You can log in now.");
      setPassword("");
      setConfirm("");
      setCaptcha("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reset failed");
    } finally {
      setSubmitting(false);
    }
  }

  const sendLabel =
    cooldown > 0 ? `Resend in ${cooldown}s` : sending ? "Sending..." : "Send code";

  return (
    <FlowBackground>
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md border rounded-lg p-6 bg-white text-slate-900 shadow-xl shadow-emerald-500/10">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Reset password</h1>
            <Link className="text-xs underline" href="/login">
              Back to login
            </Link>
          </div>

          <form className="mt-4 space-y-3" onSubmit={onSubmit}>
            <div>
              <label className="block text-sm font-medium">Email</label>
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
              <label className="block text-sm font-medium">Captcha</label>
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
              <p className="mt-1 text-xs text-gray-500">Code expires in 5 minutes.</p>
            </div>

            <div>
              <label className="block text-sm font-medium">New password</label>
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
              <label className="block text-sm font-medium">Confirm new password</label>
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
            {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

            <button
              className="w-full rounded bg-black text-white py-2 disabled:opacity-50"
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Updating..." : "Update password"}
            </button>
          </form>
        </div>
      </div>
    </FlowBackground>
  );
}
