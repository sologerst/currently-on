"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AlwaysOnLogo } from "@/components/AlwaysOnLogo";
import {
  passwordIsStrongEnough,
  safeNextPath,
} from "@/lib/auth-redirect";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type AuthMode = "idle" | "login" | "register" | "magic" | "reset";

export function AuthSignIn({
  errorMessage,
  splash = false,
  next = "/friends",
}: {
  errorMessage?: string | null;
  splash?: boolean;
  next?: string;
}) {
  const router = useRouter();
  const dest = safeNextPath(next);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(errorMessage ?? null);
  const [mode, setMode] = useState<AuthMode>(splash ? "idle" : "login");

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

  function redirectTo() {
    return `${window.location.origin}/auth/confirm?next=${encodeURIComponent(dest)}`;
  }

  async function onPasswordLogin(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !password) return;
    setBusy(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      });
      if (error) throw error;
      router.replace(dest);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  async function onPasswordRegister(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !password) return;
    if (!passwordIsStrongEnough(password)) {
      setMessage("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: trimmed,
        password,
        options: { emailRedirectTo: redirectTo() },
      });
      if (error) throw error;
      if (data.session) {
        router.replace(dest);
        router.refresh();
        return;
      }
      setMessage("Check your email to confirm your account, then sign in.");
      setMode("login");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not register");
    } finally {
      setBusy(false);
    }
  }

  async function sendMagic(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setBusy(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: redirectTo(),
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
      router.replace(dest);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setBusy(false);
    }
  }

  async function sendReset(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setBusy(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent("/auth/update-password")}`,
      });
      if (error) throw error;
      setMessage("Password reset email sent. Open the link to choose a new password.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not send reset");
    } finally {
      setBusy(false);
    }
  }

  const emailField = (
    <input
      type="email"
      required
      autoComplete="email"
      className="field"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      placeholder="you@email.com"
    />
  );

  const passwordField = (
    <input
      type="password"
      required
      autoComplete={mode === "register" ? "new-password" : "current-password"}
      className="field"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      placeholder="Password (8+ characters)"
      minLength={8}
    />
  );

  let form: React.ReactNode = null;

  if (mode === "login") {
    form = (
      <div className="space-y-3">
        <form onSubmit={(e) => void onPasswordLogin(e)} className="flex flex-col gap-2">
          {emailField}
          {passwordField}
          <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <div className="flex flex-wrap justify-center gap-3 font-display text-[11px] uppercase tracking-[0.14em] text-white/45">
          <button type="button" onClick={() => setMode("magic")}>
            Magic link
          </button>
          <button type="button" onClick={() => setMode("reset")}>
            Forgot password
          </button>
          <button type="button" onClick={() => setMode("register")}>
            Create account
          </button>
        </div>
      </div>
    );
  } else if (mode === "register") {
    form = (
      <div className="space-y-3">
        <form onSubmit={(e) => void onPasswordRegister(e)} className="flex flex-col gap-2">
          {emailField}
          {passwordField}
          <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>
        <button
          type="button"
          className="w-full font-display text-[11px] uppercase tracking-[0.14em] text-white/45"
          onClick={() => setMode("login")}
        >
          Already have an account
        </button>
      </div>
    );
  } else if (mode === "magic") {
    form = (
      <div className="space-y-3">
        <form onSubmit={(e) => void sendMagic(e)} className="flex flex-col gap-2">
          {emailField}
          <button type="submit" disabled={busy} className="btn-ghost disabled:opacity-60">
            {busy && !sent ? "Sending…" : "Email me a link"}
          </button>
        </form>
        {sent && (
          <form onSubmit={(e) => void verifyCode(e)} className="flex flex-col gap-2">
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              className="field font-mono tracking-widest"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="6-digit code"
            />
            <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
              Verify code
            </button>
          </form>
        )}
        <button
          type="button"
          className="w-full font-display text-[11px] uppercase tracking-[0.14em] text-white/45"
          onClick={() => setMode("login")}
        >
          Use password instead
        </button>
      </div>
    );
  } else if (mode === "reset") {
    form = (
      <div className="space-y-3">
        <form onSubmit={(e) => void sendReset(e)} className="flex flex-col gap-2">
          {emailField}
          <button type="submit" disabled={busy} className="btn-ghost disabled:opacity-60">
            {busy ? "Sending…" : "Send reset link"}
          </button>
        </form>
        <button
          type="button"
          className="w-full font-display text-[11px] uppercase tracking-[0.14em] text-white/45"
          onClick={() => setMode("login")}
        >
          Back to sign in
        </button>
      </div>
    );
  }

  const body = (
    <div className="space-y-3">
      {form}
      {message && <p className="text-center text-sm text-muted">{message}</p>}
    </div>
  );

  if (!splash) return body;

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
            {mode === "register"
              ? "Create account"
              : mode === "magic"
                ? "Magic link"
                : mode === "reset"
                  ? "Reset password"
                  : "Log in"}
          </p>
          {body}
          <button
            type="button"
            className="mt-4 w-full text-center font-display text-[11px] font-light uppercase tracking-[0.16em] text-white/45"
            onClick={() => {
              setMode("idle");
              setMessage(null);
              setSent(false);
            }}
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
}
