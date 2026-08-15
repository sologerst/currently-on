"use client";

import { useState } from "react";
import { CATEGORY_META } from "@/lib/categories";
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
      className={`grid shrink-0 place-items-center rounded-2xl text-center font-display leading-tight text-white ${size}`}
      style={{
        background: `linear-gradient(160deg, ${hex}, color-mix(in srgb, ${hex} 65%, #111))`,
      }}
    >
      <span className="px-1">{name.split(" ").slice(0, 2).join(" ")}</span>
    </div>
  );
}

export function Poster({
  name,
  kind,
  large,
  imageUrl,
}: {
  name: string;
  kind: CategoryKind;
  large?: boolean;
  imageUrl?: string;
}) {
  const [broken, setBroken] = useState(false);
  const size = large
    ? "h-52 w-40 text-lg shadow-[0_18px_40px_rgba(18,20,26,0.18)]"
    : "h-[4.5rem] w-[3.35rem] text-[10px]";

  if (imageUrl && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={name}
        className={`shrink-0 rounded-2xl object-cover ${size}`}
        onError={() => setBroken(true)}
      />
    );
  }

  return <LetterPoster name={name} kind={kind} size={size} />;
}

export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-[11px] font-medium text-muted">
      {children}
    </span>
  );
}

export function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange?: (n: number) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className="pressable text-xl leading-none"
          style={{ color: n <= value ? "var(--friends)" : "#C9CED6" }}
          aria-label={`${n} stars`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
