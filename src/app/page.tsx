"use client";

import Link from "next/link";
import { CATEGORY_META, HOME_TILES } from "@/lib/categories";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="font-display text-3xl">Currently On</h1>
      <p className="mt-1 text-sm text-black/50">
        What you&apos;re into — and what friends say you should try next.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        {HOME_TILES.map((key) => {
          const t = CATEGORY_META[key];
          return (
            <Link
              key={key}
              href={t.href}
              className="aspect-square rounded-3xl border border-black/8 bg-[#F6F7F9] p-4"
            >
              <div
                className="grid h-12 w-12 place-items-center rounded-2xl text-xl"
                style={{
                  background: t.hex,
                  color: t.onDark ? "#14161A" : "#fff",
                }}
              >
                {t.icon}
              </div>
              <p className="mt-8 font-display text-xl">{t.label}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
