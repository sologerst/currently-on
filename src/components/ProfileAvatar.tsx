"use client";

import { AvatarMark } from "@/components/AvatarMark";
import { avatarPublicUrl } from "@/lib/community";

export function ProfileAvatar({
  path,
  name,
  size = "md",
  ring = false,
  className = "",
}: {
  path?: string | null;
  name?: string;
  size?: "sm" | "md" | "lg";
  ring?: boolean;
  className?: string;
}) {
  const url = avatarPublicUrl(path);
  const dim =
    size === "lg" ? "h-20 w-20" : size === "sm" ? "h-8 w-8" : "h-11 w-11";
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-xs" : "text-sm";

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name || "Avatar"}
        className={`inline-block shrink-0 rounded-lg object-cover ${dim} ${
          ring ? "ring-1 ring-[var(--gold)]" : "ring-1 ring-white/25"
        } ${className}`}
      />
    );
  }

  if (name?.trim()) {
    return (
      <span
        className={`inline-grid shrink-0 place-items-center rounded-lg bg-[#041018] font-display ${dim} ${text} ${
          ring ? "ring-1 ring-[var(--gold)]" : "ring-1 ring-white/25"
        } ${className}`}
        aria-hidden
      >
        {name.trim().slice(0, 1).toUpperCase()}
      </span>
    );
  }

  return <AvatarMark size={size} ring={ring} className={className} />;
}
