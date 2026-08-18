"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AlwaysOnLogo } from "@/components/AlwaysOnLogo";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function AuthSignIn({
  errorMessage,
  splash = false,
}: {
  errorMessage?: string | null;
  splash?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(errorMessage ?? null);
  const [mode, setMode] = useState<"idle" | "login" | "register">("idle");

  if (!isSupabaseConfigured()) {
    return (
      <p className="panel px-3 py-3 text-sm text-muted">
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
    if (!trimmed || token.length === 0) return;
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

  const form = (
    <div className="space-y-3">
      <form onSubmit={sendLink} className="flex flex-col gap-2">
        <input
          type="email"
          required
          autoComplete="email"
          className="field"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
        />
        <button
          type="submit"
          disabled={busy}
          className="btn-ghost disabled:opacity-60"
        >
          {busy && !sent ? "Sending…" : "Email me a link"}
        </button>
      </form>

      {sent && (
        <form onSubmit={verifyCode} className="flex flex-col gap-2">
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            className="field font-mono tracking-widest"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="6-digit code"
          />
          <button
            type="submit"
            disabled={busy}
            className="btn-primary disabled:opacity-60"
          >
            Verify code
          </button>
        </form>
      )}

      {message && <p className="text-center text-sm text-muted">{message}</p>}
    </div>
  );

  if (!splash) return form;

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-2 pb-10">
      <AlwaysOnLogo size="lg" glow />
      {mode === "idle" ? (
        <div className="mt-16 flex w-full max-w-xs flex-col gap-3">
          <button
            type="button"
            className="btn-ghost w-full py-3"
            onClick={() => setMode("login")}
          >
            Log In
          </button>
          <button
            type="button"
            className="btn-ghost w-full py-3"
            onClick={() => setMode("register")}
          >
            Register
          </button>
        </div>
      ) : (
        <div className="mt-10 w-full max-w-sm">
          <p className="mb-4 text-center font-display text-sm font-light uppercase tracking-[0.22em] text-white/70">
            {mode === "register" ? "Create account" : "Log in"}
          </p>
          {form}
          <button
            type="button"
            className="mt-4 w-full text-center font-display text-[11px] font-light uppercase tracking-[0.16em] text-white/45"
            onClick={() => setMode("idle")}
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
}
