"use client";

import { useId } from "react";

export function AvatarMark({
  size = "md",
  ring = false,
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  ring?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const dim =
    size === "lg" ? "h-20 w-20" : size === "sm" ? "h-8 w-8" : "h-11 w-11";

  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-lg bg-[#041018] ${dim} ${
        ring ? "ring-1 ring-[var(--gold)]" : "ring-1 ring-white/25"
      } ${className}`}
      aria-hidden
    >
      <svg viewBox="0 0 64 64" className="h-[86%] w-[86%]">
        <defs>
          <radialGradient id={uid} cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#7ad7ff" />
            <stop offset="45%" stopColor="#1d6bff" />
            <stop offset="100%" stopColor="#07162a" />
          </radialGradient>
        </defs>
        <ellipse cx="32" cy="32" rx="26" ry="18" fill={`url(#${uid})`} />
        <circle cx="32" cy="32" r="9" fill="#041018" />
        <circle cx="32" cy="32" r="4.2" fill="#9be7ff" />
        <circle cx="28" cy="28" r="1.6" fill="white" />
      </svg>
    </span>
  );
}
