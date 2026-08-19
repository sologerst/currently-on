"use client";

import { useMemo, useState } from "react";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { invitePath, profileLabel } from "@/lib/community";
import { useTracker } from "@/lib/tracker";

export function InvitePanel() {
  const { state } = useTracker();
  const [copied, setCopied] = useState(false);
  const url = useMemo(() => {
    if (!state.inviteCode || typeof window === "undefined") return "";
    return `${window.location.origin}${invitePath(state.inviteCode)}`;
  }, [state.inviteCode]);

  if (!state.inviteCode) {
    return (
      <p className="text-sm text-muted">Sign in to get an invite link.</p>
    );
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="panel space-y-4 p-4">
      <div className="flex items-center gap-3">
        <ProfileAvatar
          path={state.avatarPath}
          name={profileLabel({
            displayName: state.displayName,
            handle: state.handle,
          })}
          size="md"
          ring
        />
        <div>
          <p className="font-display text-lg font-semibold tracking-wide">
            Invite a friend
          </p>
          <p className="font-display text-xs font-light text-white/60">
            They follow you and become friends when they join.
          </p>
        </div>
      </div>
      <p className="break-all font-mono text-[11px] text-white/70">{url}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" onClick={() => void copy()}>
          {copied ? "Copied" : "Copy link"}
        </button>
        {typeof navigator !== "undefined" && "share" in navigator && (
          <button
            type="button"
            className="btn-ghost"
            onClick={() =>
              void navigator.share({
                title: "Always On",
                text: "Join me on Always On",
                url,
              })
            }
          >
            Share
          </button>
        )}
      </div>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`}
          alt="Invite QR code"
          className="mx-auto rounded-2xl bg-white p-3"
          width={220}
          height={220}
        />
      )}
    </div>
  );
}
