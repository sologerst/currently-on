"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AuthSignIn } from "@/components/AuthSignIn";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { loadProfileByInvite } from "@/lib/community-remote";
import { profileLabel } from "@/lib/community";
import type { Person } from "@/lib/community-types";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useTracker } from "@/lib/tracker";

export function JoinScreen({ code }: { code: string }) {
  const { ready, signedIn, redeemInviteCode } = useTracker();
  const [person, setPerson] = useState<Person | null>(null);
  const [status, setStatus] = useState<"idle" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const redeemed = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    void loadProfileByInvite(supabase, code)
      .then(setPerson)
      .catch(() => setPerson(null));
  }, [code]);

  useEffect(() => {
    if (!signedIn || !ready || redeemed.current) return;
    redeemed.current = true;
    void redeemInviteCode(code)
      .then(() => setStatus("done"))
      .catch((err: unknown) => {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Could not join");
      });
  }, [signedIn, ready, code, redeemInviteCode]);

  if (!ready) {
    return <p className="px-4 py-8 text-sm text-muted">Loading…</p>;
  }

  if (!signedIn) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6">
        <h1 className="mb-4 text-center font-display text-2xl">
          {person
            ? `${profileLabel(person)} invited you`
            : "Join Always On"}
        </h1>
        {person && (
          <div className="mb-6 flex justify-center">
            <ProfileAvatar
              path={person.avatarPath}
              name={profileLabel(person)}
              size="lg"
              ring
            />
          </div>
        )}
        <AuthSignIn next={`/join/${code}`} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 text-center">
      {status === "done" ? (
        <>
          <h1 className="font-display text-3xl">You’re in</h1>
          <p className="mt-2 text-sm text-muted">
            You follow {person ? profileLabel(person) : "them"} and you’re friends.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/friends" className="btn-primary">
              Friends
            </Link>
            {person && (
              <Link href={`/u/${person.handle}`} className="btn-ghost">
                Profile
              </Link>
            )}
          </div>
        </>
      ) : status === "error" ? (
        <>
          <h1 className="font-display text-3xl">Invite issue</h1>
          <p className="mt-2 text-sm text-muted">{error}</p>
          <Link href="/friends?tab=people" className="btn-ghost mt-6">
            Find people
          </Link>
        </>
      ) : (
        <p className="text-sm text-muted">Joining…</p>
      )}
    </div>
  );
}
