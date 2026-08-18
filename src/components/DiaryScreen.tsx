"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AvatarMark } from "@/components/AvatarMark";
import { CoverCard } from "@/components/MediaBits";
import { SectionRule } from "@/components/SectionRule";
import { CATEGORY_META, MEDIA_KINDS } from "@/lib/categories";
import { getItem } from "@/lib/catalog";
import { useTracker } from "@/lib/tracker";
import type { CategoryKind } from "@/lib/types";

export function DiaryScreen() {
  const { state, signedIn, userEmail } = useTracker();
  const [kind, setKind] = useState<CategoryKind>("movies");
  const year = new Date().getFullYear();
  const ytd = state.diary.filter(
    (d) => new Date(d.dateFinished).getFullYear() === year,
  );
  const rated = ytd.filter((d) => d.personalRating > 0);
  const avg =
    rated.length === 0
      ? 0
      : rated.reduce((s, d) => s + d.personalRating, 0) / rated.length;

  const watches = Object.keys(state.tracked).length;
  const reviews = Object.values(state.tracked).filter(
    (t) => t.myReview.trim() || t.myRating > 0,
  ).length;
  const name = state.displayName || (signedIn ? userEmail?.split("@")[0] : "Guest");

  const watching = Object.values(state.tracked).find(
    (t) => t.myStatus === "watching" || t.myStatus === "following",
  );
  const last = state.diary[0];
  const suggestion = state.recommendations.find(
    (r) => r.author === state.displayName,
  );

  const posters = useMemo(() => {
    return Object.values(state.tracked)
      .filter((t) => t.kind === kind)
      .map((t) => {
        const item = getItem(t.kind, t.itemId);
        return {
          id: t.itemId,
          kind: t.kind,
          name: item?.name || t.itemName || t.itemId,
          imageUrl: item?.imageUrl || t.imageUrl,
          rating: t.myRating || item?.rating,
          platform: item?.platform,
        };
      });
  }, [state.tracked, kind]);

  const suggestions = state.recommendations
    .filter((r) => r.itemKind === kind)
    .slice(0, 8);

  return (
    <div className="mx-auto max-w-lg px-4 pb-8 pt-3">
      <div className="flex gap-4">
        <AvatarMark size="lg" ring />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-display text-lg font-medium uppercase tracking-[0.12em] text-[var(--gold)]">
                {name}
              </p>
              <p className="mt-0.5 font-display text-[11px] font-light text-[var(--cyan)]">
                {signedIn ? `Member since ${year}` : "Browsing as guest"}
              </p>
            </div>
            <Link
              href="/friends"
              className="font-display text-[11px] font-light uppercase tracking-[0.18em] text-[var(--gold)]"
            >
              Edit
            </Link>
          </div>
          <div className="mt-3 flex gap-6">
            <div>
              <p className="font-display text-[10px] font-light uppercase tracking-[0.16em] text-white/50">
                Watches
              </p>
              <p className="font-display text-xl font-semibold">{watches}</p>
            </div>
            <div>
              <p className="font-display text-[10px] font-light uppercase tracking-[0.16em] text-white/50">
                Reviews
              </p>
              <p className="font-display text-xl font-semibold">{reviews}</p>
            </div>
            <div>
              <p className="font-display text-[10px] font-light uppercase tracking-[0.16em] text-white/50">
                Avg
              </p>
              <p className="font-display text-xl font-semibold">
                {avg ? avg.toFixed(1) : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <ul className="mt-5 space-y-2 font-display text-sm font-light text-[var(--cyan)]">
        <li>
          <span className="mr-2">◎</span>
          Watching:{" "}
          <span className="text-white">
            {watching?.itemName ||
              (watching && getItem(watching.kind, watching.itemId)?.name) ||
              "—"}
          </span>
        </li>
        <li>
          <span className="mr-2">↺</span>
          Last watched:{" "}
          <span className="text-white">{last?.name || "—"}</span>
        </li>
        <li>
          <span className="mr-2">★</span>
          Suggests:{" "}
          <span className="text-white">{suggestion?.itemName || "—"}</span>
        </li>
      </ul>

      <nav className="mt-6 flex items-baseline justify-between gap-2">
        {MEDIA_KINDS.filter((k) => k !== "books").map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setKind(tab)}
            className={`tab-link ${kind === tab ? "is-active" : ""}`}
          >
            {CATEGORY_META[tab].tab}
          </button>
        ))}
      </nav>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {posters.slice(0, 6).map((p) => (
          <Link key={p.id} href={`/${p.kind}/${p.id}`} className="pressable">
            <CoverCard
              name={p.name}
              kind={p.kind}
              imageUrl={p.imageUrl}
              rating={p.rating}
              variant="tile"
            />
          </Link>
        ))}
        {posters.length === 0 && (
          <p className="col-span-3 py-6 text-sm text-muted">
            Track titles to fill this shelf.
          </p>
        )}
      </div>

      <section className="mt-7">
        <SectionRule>Suggestions</SectionRule>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {suggestions.map((r) => {
            const item = getItem(r.itemKind, r.itemId);
            return (
              <Link
                key={r.id}
                href={`/${r.itemKind}/${r.itemId}`}
                className="pressable"
              >
                <CoverCard
                  name={item?.name || r.itemName}
                  kind={r.itemKind}
                  imageUrl={item?.imageUrl}
                  rating={item?.rating}
                  variant="wide"
                />
                <p className="mt-2 truncate font-display text-xs font-medium uppercase tracking-wide">
                  {r.itemName}
                </p>
              </Link>
            );
          })}
          {suggestions.length === 0 && (
            <p className="col-span-2 text-sm text-muted">
              Friend picks will land here.
            </p>
          )}
        </div>
      </section>

      <section className="mt-8">
        <SectionRule>Diary {year}</SectionRule>
        <ul className="mt-3 divide-y divide-white/10">
          {state.diary.length === 0 && (
            <li className="py-4 text-sm text-muted">
              Finish something to start the log.
            </li>
          )}
          {state.diary.map((d) => (
            <li key={`${d.kind}-${d.itemId}-${d.dateFinished}`}>
              <Link
                href={`/${d.kind}/${d.itemId}`}
                className="pressable block py-3.5"
              >
                <p className="font-display text-[10px] font-light uppercase tracking-wide text-muted">
                  {new Date(d.dateFinished).toLocaleDateString()}
                </p>
                <p className="font-display text-lg leading-tight tracking-wide">
                  {d.name}
                </p>
                <p className="mt-0.5 font-display text-xs font-light text-muted">
                  {CATEGORY_META[d.kind].label}
                  {d.personalRating ? ` · ${d.personalRating}★` : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
