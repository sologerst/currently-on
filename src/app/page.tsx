"use client";

import Link from "next/link";
import { CATEGORY_META, HOME_TILES } from "@/lib/categories";

export default function HomePage() {
  return (
    <div className="relative mx-auto max-w-lg overflow-hidden px-4 pb-8 pt-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 top-0 h-56 w-56 rounded-full bg-[var(--movies)]/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 top-24 h-48 w-48 rounded-full bg-[var(--music)]/20 blur-3xl"
      />

      <header className="animate-rise relative">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
          Right now
        </p>
        <h1 className="mt-1 font-display text-[2.75rem] leading-[0.95] tracking-tight">
          Currently On
        </h1>
        <p className="mt-3 max-w-[22rem] text-[0.95rem] leading-relaxed text-muted">
          What you&apos;re into — and what friends say you should try next.
        </p>
      </header>

      <div className="stagger relative mt-8 grid grid-cols-2 gap-3">
        {HOME_TILES.map((key) => {
          const t = CATEGORY_META[key];
          return (
            <Link
              key={key}
              href={t.href}
              className="pressable relative flex aspect-[0.95] flex-col justify-between overflow-hidden rounded-[1.5rem] p-4 text-left"
              style={{
                background: `linear-gradient(155deg, ${t.hex} 0%, color-mix(in srgb, ${t.hex} 72%, #0b1020) 100%)`,
                color: t.onDark ? "#12141A" : "#fff",
              }}
            >
              <span
                className="grid h-11 w-11 place-items-center rounded-2xl text-xl"
                style={{
                  background: t.onDark
                    ? "rgba(18,20,26,0.12)"
                    : "rgba(255,255,255,0.18)",
                }}
              >
                {t.icon}
              </span>
              <span className="font-display text-[1.65rem] leading-none">
                {t.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
