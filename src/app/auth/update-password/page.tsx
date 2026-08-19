"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { passwordIsStrongEnough } from "@/lib/auth-redirect";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useTracker } from "@/lib/tracker";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const { signedIn, ready } = useTracker();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!passwordIsStrongEnough(password)) {
      setMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }
    if (!isSupabaseConfigured()) return;
    setBusy(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage("Password updated.");
      router.replace("/friends");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return <p className="px-4 py-8 text-sm text-muted">Loading…</p>;
  }

  if (!signedIn) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <h1 className="font-display text-3xl">Reset link needed</h1>
        <p className="mt-2 text-sm text-muted">
          Open the email link first, then you can choose a new password.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="font-display text-3xl">New password</h1>
      <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-3">
        <input
          type="password"
          className="field"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password (8+)"
          minLength={8}
          required
        />
        <input
          type="password"
          className="field"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm password"
          minLength={8}
          required
        />
        <button className="btn-primary" disabled={busy}>
          {busy ? "Saving…" : "Save password"}
        </button>
      </form>
      {message && <p className="mt-3 text-sm text-muted">{message}</p>}
    </div>
  );
}
