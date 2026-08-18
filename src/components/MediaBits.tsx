"use client";

import { useState } from "react";
import { CATEGORY_META } from "@/lib/categories";
import { ratingLabel, starsOutOfFive } from "@/lib/ratings";
import type { CategoryKind } from "@/lib/types";

function LetterPoster({
  name,
  kind,
  size,
}: {
  name: string;
  kind: CategoryKind;
  size: string;
}) {
  const hex = CATEGORY_META[kind].hex;
  return (
    <div
      className={`grid shrink-0 place-items-center rounded-[14px] text-center font-display text-[11px] font-light uppercase leading-tight tracking-wide text-white ${size}`}
      style={{
        background: `linear-gradient(160deg, ${hex}, color-mix(in srgb, ${hex} 45%, #05080d))`,
      }}
    >
      <span className="px-1">{name.split(" ").slice(0, 2).join(" ")}</span>
    </div>
  );
}

export type PosterVariant = "sm" | "lg" | "hero" | "wide" | "tile" | "album";

function sizeClass(kind: CategoryKind, variant: PosterVariant) {
  const square = kind === "music" || kind === "podcasts";
  switch (variant) {
    case "hero":
      return square
        ? "h-auto w-full aspect-square text-lg"
        : "h-auto w-full aspect-video text-lg";
    case "wide":
      return square
        ? "h-[7.4rem] w-[7.4rem] text-[10px]"
        : "h-[6.6rem] w-[11.2rem] text-[10px]";
    case "tile":
      return "h-[9.6rem] w-[6.4rem] text-[10px]";
    case "album":
      return "h-[7.4rem] w-[7.4rem] text-[10px]";
    case "lg":
      return square
        ? "h-44 w-44 text-lg shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
        : "h-52 w-40 text-lg shadow-[0_18px_40px_rgba(0,0,0,0.35)]";
    case "sm":
      return square
        ? "h-[4.5rem] w-[4.5rem] text-[10px]"
        : "h-[4.5rem] w-[3.35rem] text-[10px]";
    default:
      return square
        ? "h-[4.5rem] w-[4.5rem] text-[10px]"
        : "h-[4.5rem] w-[3.35rem] text-[10px]";
  }
}

export function Poster({
  name,
  kind,
  large,
  imageUrl,
  variant,
}: {
  name: string;
  kind: CategoryKind;
  large?: boolean;
  imageUrl?: string;
  variant?: PosterVariant;
}) {
  const [broken, setBroken] = useState(false);
  const size = sizeClass(kind, variant ?? (large ? "lg" : "sm"));

  if (imageUrl && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={name}
        className={`shrink-0 rounded-[14px] object-cover ${size}`}
        onError={() => setBroken(true)}
      />
    );
  }

  return <LetterPoster name={name} kind={kind} size={size} />;
}

export function RatingBadge({ rating }: { rating?: number }) {
  const label = ratingLabel(rating);
  if (!label) return null;
  return (
    <span className="absolute right-1.5 top-1.5 z-10 inline-flex items-center gap-0.5 rounded-full bg-black/70 px-1.5 py-0.5 font-display text-[11px] font-medium tracking-wide text-white">
      <span className="text-[0.7rem] text-[var(--gold)]">★</span>
      {label}
    </span>
  );
}

export function CoverCard({
  name,
  kind,
  imageUrl,
  rating,
  variant = "wide",
}: {
  name: string;
  kind: CategoryKind;
  imageUrl?: string;
  rating?: number;
  variant?: PosterVariant;
}) {
  return (
    <div className="relative shrink-0">
      <Poster name={name} kind={kind} imageUrl={imageUrl} variant={variant} />
      <RatingBadge rating={rating} />
    </div>
  );
}

export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-muted">
      {children}
    </span>
  );
}

export function StarRating({
  value,
  onChange,
  size = "md",
}: {
  value: number;
  onChange?: (n: number) => void;
  size?: "sm" | "md" | "lg";
}) {
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-lg";
  const shown = starsOutOfFive(value);
  return (
    <div className={`flex items-center gap-0.5 ${text} leading-none`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className="pressable disabled:cursor-default"
          style={{
            color: n <= Math.round(shown) ? "var(--gold)" : "rgba(255,255,255,0.22)",
          }}
          aria-label={`${n} stars`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function PlatformMark({ platform }: { platform?: string }) {
  if (!platform) return null;
  return (
    <span className="shrink-0 font-display text-[10px] font-light uppercase tracking-[0.14em] text-white/80">
      {platform}
    </span>
  );
}

export const REEL_FEELS = ["😂", "😢", "😍", "🔥", "👏"] as const;
