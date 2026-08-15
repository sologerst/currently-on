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
      <h1 className="font-display text-[2.4rem] leading-none">Diary</h1>
      <section className="mt-5 rounded-[1.35rem] bg-surface p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          Your year so far
        </p>
        <p className="mt-1 font-display text-3xl">{year}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(byKind).map(([k, n]) => (
            <span
              key={k}
              className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-sm font-medium"
            >
              {CATEGORY_META[k as keyof typeof CATEGORY_META].label}: {n}
            </span>
          ))}
          {ytd.length === 0 && (
            <span className="text-sm text-muted">
              Finish something to start the log.
            </span>
          )}
        </div>
        <p className="mt-3 font-mono text-sm text-muted">
          Avg rating {avg ? avg.toFixed(1) : "—"}
        </p>
      </section>
      <ul className="mt-4 divide-y divide-[var(--hairline)]">
        {state.diary.map((d) => (
          <li key={`${d.kind}-${d.itemId}-${d.dateFinished}`}>
            <Link
              href={`/${d.kind}/${d.itemId}`}
              className="pressable block py-3.5"
            >
              <p className="font-mono text-[10px] uppercase tracking-wide text-muted">
                {new Date(d.dateFinished).toLocaleDateString()}
              </p>
              <p className="font-display text-lg leading-tight">{d.name}</p>
              <p className="mt-0.5 text-xs text-muted">
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
