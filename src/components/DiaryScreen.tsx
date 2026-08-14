"use client";

import Link from "next/link";
import { CATEGORY_META } from "@/lib/categories";
import { useTracker } from "@/lib/tracker";

export function DiaryScreen() {
  const { state } = useTracker();
  const year = new Date().getFullYear();
  const ytd = state.diary.filter(
    (d) => new Date(d.dateFinished).getFullYear() === year,
  );
  const byKind = ytd.reduce<Record<string, number>>((acc, d) => {
    acc[d.kind] = (acc[d.kind] || 0) + 1;
    return acc;
  }, {});
  const rated = ytd.filter((d) => d.personalRating > 0);
  const avg =
    rated.length === 0
      ? 0
      : rated.reduce((s, d) => s + d.personalRating, 0) / rated.length;

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="font-display text-3xl">Diary</h1>
      <section className="mt-4 rounded-2xl border border-black/8 bg-[#F6F7F9] p-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-black/40">
          Your year so far
        </p>
        <p className="font-display text-xl">{year}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {Object.entries(byKind).map(([k, n]) => (
            <span key={k} className="text-sm">
              {CATEGORY_META[k as keyof typeof CATEGORY_META].label}: {n}
            </span>
          ))}
          {ytd.length === 0 && (
            <span className="text-sm text-black/45">
              Finish something to start the log.
            </span>
          )}
        </div>
        <p className="mt-2 font-mono text-sm">
          Avg rating {avg ? avg.toFixed(1) : "—"}
        </p>
      </section>
      <ul className="mt-4 space-y-2">
        {state.diary.map((d) => (
          <li key={`${d.kind}-${d.itemId}-${d.dateFinished}`}>
            <Link
              href={`/${d.kind}/${d.itemId}`}
              className="block rounded-2xl border border-black/8 p-3"
            >
              <p className="font-mono text-[10px] text-black/40">
                {new Date(d.dateFinished).toLocaleDateString()}
              </p>
              <p className="font-display">{d.name}</p>
              <p className="text-xs text-black/50">
                {CATEGORY_META[d.kind].label}
                {d.personalRating ? ` · ${d.personalRating}★` : ""}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
