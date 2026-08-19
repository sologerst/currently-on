"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import {
  Badge,
  Poster,
  REEL_FEELS,
  StarRating,
} from "@/components/MediaBits";
import { CATEGORY_META, lookItUpUrl } from "@/lib/categories";
import { getItem } from "@/lib/catalog";
import { RecommendComposer } from "@/components/RecommendComposer";
import { fetchCatalogItem } from "@/lib/catalog-client";
import { ratingLabel } from "@/lib/ratings";
import { useTracker } from "@/lib/tracker";
import type { CatalogItem, CategoryKind } from "@/lib/types";

export function DetailScreen({
  kind,
  id,
}: {
  kind: CategoryKind;
  id: string;
}) {
  const seed = getItem(kind, id);
  const itemKey = `${kind}:${id}`;
  const [live, setLive] = useState<{
    key: string;
    item: CatalogItem | null;
  } | null>(null);
  const item = seed ?? (live?.key === itemKey ? live.item : null);
  const loading = !seed && live?.key !== itemKey;
  const meta = CATEGORY_META[kind];
  const { getTracked, track, setRating, setReview, state } =
    useTracker();
  const rec = getTracked(kind, id);
  const [feels, setFeels] = useState<string[]>([]);

  useEffect(() => {
    if (seed) return;
    let cancelled = false;
    void fetchCatalogItem(kind, id).then((row) => {
      if (!cancelled) setLive({ key: `${kind}:${id}`, item: row });
    });
    return () => {
      cancelled = true;
    };
  }, [kind, id, seed]);

  if (loading) {
    return <p className="p-6 text-sm text-muted">Loading…</p>;
  }
  if (!item) {
    return <p className="p-6 text-sm text-muted">Not found.</p>;
  }

  const score = ratingLabel(rec?.myRating || item.rating);
  const review = rec?.myReview ?? "";

  return (
    <div className="mx-auto max-w-lg px-4 pb-8 pt-3">
      <p className="mb-3 flex items-center gap-2 font-display text-xs font-light tracking-wide text-white/80">
        <ProfileAvatar
          path={state.avatarPath}
          name={state.displayName || state.handle}
          size="sm"
        />
        <span>
          {state.displayName || "You"}
          <span className="text-white/45">
            {kind === "music" ? " right now:" : " last watch:"}
          </span>
        </span>
      </p>

      <Poster
        name={item.name}
        kind={kind}
        imageUrl={item.imageUrl}
        variant="hero"
      />

      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-[1.85rem] font-semibold leading-[1.05] tracking-wide">
            {item.name}
          </h1>
          {item.author && (
            <p className="mt-1 font-display text-sm font-light text-white/70">
              {item.author}
            </p>
          )}
        </div>
        <Link
          href={`/${kind}`}
          className="shrink-0 font-display text-[11px] font-light uppercase tracking-[0.16em] text-white/50"
        >
          ← {meta.tab}
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <StarRating
            value={rec?.myRating || item.rating || 0}
            onChange={(n) => {
              if (!rec) track(kind, id, undefined, item.name, item.imageUrl);
              setRating(kind, id, n);
            }}
          />
          {score && (
            <span className="font-display text-lg font-semibold text-white">
              {score}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-display text-[11px] font-light uppercase tracking-[0.14em] text-[var(--cyan)]">
            Reel Feels:
          </span>
          {REEL_FEELS.map((e) => (
            <button
              key={e}
              type="button"
              className={`pressable text-lg ${
                feels.includes(e) ? "opacity-100" : "opacity-40"
              }`}
              onClick={() =>
                setFeels((curr) =>
                  curr.includes(e) ? curr.filter((x) => x !== e) : [...curr, e],
                )
              }
              aria-label={`Feel ${e}`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-4 font-display text-[10px] font-light uppercase tracking-[0.18em] text-white/50">
        Where to watch
      </p>
      <p className="mt-1 font-display text-sm font-light uppercase tracking-[0.12em]">
        {item.platform || "Look it up"}
        {item.notYetStreaming ? " · not yet streaming" : ""}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {item.seasonCount ? <Badge>{item.seasonCount} seasons</Badge> : null}
        {item.runningStatus ? <Badge>{item.runningStatus}</Badge> : null}
        {item.genre ? <Badge>{item.genre}</Badge> : null}
        {item.genres?.slice(0, 5).map((g) => (
          <Badge key={g}>{g}</Badge>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {!rec && (
          <button
            type="button"
            className="btn-primary"
            onClick={() => track(kind, id, undefined, item.name, item.imageUrl)}
          >
            Add to my list
          </button>
        )}
        <a
          className="btn-ghost"
          href={lookItUpUrl(item.name)}
          target="_blank"
          rel="noreferrer"
        >
          Look it up
        </a>
      </div>

      <section className="panel relative mt-6 px-4 pb-8 pt-4">
        <p className="font-display text-lg font-semibold tracking-wide">Why?</p>
        <textarea
          className="mt-2 min-h-28 w-full resize-none bg-transparent font-display text-sm font-light leading-relaxed tracking-wide text-white/90 outline-none"
          placeholder="A short take…"
          value={review}
          onChange={(e) => {
            if (!rec) track(kind, id, undefined, item.name, item.imageUrl);
            setReview(kind, id, e.target.value);
          }}
        />
        <ProfileAvatar
          path={state.avatarPath}
          name={state.displayName || state.handle}
          size="sm"
          className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2"
        />
      </section>

      {state.displayName && (
        <RecommendComposer
          preset={{
            kind,
            id,
            name: item.name,
            imageUrl: item.imageUrl,
          }}
        />
      )}
      {!state.displayName && (
        <p className="mt-6 px-1 text-sm text-muted">
          Sign in on{" "}
          <Link href="/friends" className="underline">
            Friends
          </Link>{" "}
          and set a display name to recommend titles.
        </p>
      )}
    </div>
  );
}
