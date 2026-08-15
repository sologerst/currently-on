"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function AuthSignIn({
  errorMessage,
}: {
  errorMessage?: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(errorMessage ?? null);

  if (!isSupabaseConfigured()) {
    return (
      <p className="rounded-[1.25rem] bg-[var(--surface-2)] px-3 py-2 text-sm text-muted">
        Supabase env vars are missing. Add{" "}
        <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="font-mono text-xs">
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
        </code>{" "}
        to continue with accounts.
      </p>
    );
  }

  async function sendLink(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setBusy(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/confirm?next=/friends`;
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: redirectTo,
          shouldCreateUser: true,
        },
      });
      if (error) throw error;
      setSent(true);
      setMessage("Check your email for a magic link or 6-digit code.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not send email");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    const token = otp.trim();
    if (!trimmed || !token) return;
    setBusy(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        email: trimmed,
        token,
        type: "email",
      });
      if (error) throw error;
      router.replace("/friends");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={sendLink} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          autoComplete="email"
          className="field flex-1 !rounded-2xl"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
        />
        <button
          type="submit"
          disabled={busy}
          className="btn-primary bg-[var(--friends)] text-foreground disabled:opacity-60"
        >
          {busy && !sent ? "Sending…" : "Email me a link"}
        </button>
      </form>

      {sent && (
        <form onSubmit={verifyCode} className="flex flex-col gap-2 sm:flex-row">
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            className="field flex-1 !rounded-2xl font-mono tracking-widest"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="6-digit code"
          />
          <button
            type="submit"
            disabled={busy}
            className="btn-ghost disabled:opacity-60"
          >
            Verify code
          </button>
        </form>
      )}

      {message && <p className="text-sm text-muted">{message}</p>}
    </div>
  );
}
