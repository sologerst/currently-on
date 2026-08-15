"use client";

import { CATEGORY_META } from "@/lib/categories";
import type { CategoryKind } from "@/lib/types";

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
  const hex = CATEGORY_META[kind].hex;
  const size = large ? "h-48 w-36 text-lg" : "h-16 w-12 text-[10px]";
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={name}
        className={`shrink-0 rounded-xl object-cover ${size}`}
      />
    );
  }
  return (
    <div
      className={`grid shrink-0 place-items-center rounded-xl text-center font-display leading-tight text-white ${size}`}
      style={{ background: hex }}
    >
      <span className="px-1">{name.split(" ").slice(0, 2).join(" ")}</span>
    </div>
  );
}

export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-black/10 bg-white px-2 py-0.5 text-[11px] text-black/70">
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
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className="text-lg"
          style={{ color: n <= value ? "#F2B705" : "#D5D7DC" }}
          aria-label={`${n} stars`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
