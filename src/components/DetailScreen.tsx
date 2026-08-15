"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Poster, StarRating } from "@/components/MediaBits";
import { CATEGORY_META, lookItUpUrl } from "@/lib/categories";
import { getItem } from "@/lib/catalog";
import { fetchCatalogItem } from "@/lib/catalog-client";
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
  const { getTracked, track, setRating, setReview, recommend, state } =
    useTracker();
  const rec = getTracked(kind, id);
  const [note, setNote] = useState("");

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

  return (
    <div className="pb-6">
      <div
        className="px-4 pb-8 pt-4"
        style={{
          background: `linear-gradient(165deg, ${meta.hex} 0%, color-mix(in srgb, ${meta.hex} 68%, #0b1020) 100%)`,
          color: meta.onDark ? "#12141A" : "#fff",
        }}
      >
        <Link
          href={`/${kind}`}
          className="text-sm font-medium opacity-75"
          style={{ color: "inherit" }}
        >
          ← {meta.label}
        </Link>
        <div className="mt-5 flex gap-4">
          <Poster
            name={item.name}
            kind={kind}
            large
            imageUrl={item.imageUrl}
          />
          <div className="min-w-0 flex-1 self-end pb-1">
            <h1 className="font-display text-[1.85rem] leading-[1.05]">
              {item.name}
            </h1>
            {item.author && (
              <p className="mt-1 text-sm opacity-80">{item.author}</p>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto -mt-4 max-w-lg space-y-4 px-4">
        <div className="rounded-[1.35rem] bg-surface p-4 shadow-[0_12px_32px_rgba(18,20,26,0.06)]">
          <div className="flex flex-wrap gap-1.5">
            {item.seasonCount ? <Badge>{item.seasonCount} seasons</Badge> : null}
            {item.runningStatus ? <Badge>{item.runningStatus}</Badge> : null}
            {item.rating ? <Badge>Community {item.rating}</Badge> : null}
            {item.platform ? <Badge>{item.platform}</Badge> : null}
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
                style={{
                  background: meta.hex,
                  color: meta.onDark ? "#12141A" : "#fff",
                }}
                onClick={() =>
                  track(kind, id, undefined, item.name, item.imageUrl)
                }
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
        </div>

        <section className="rounded-[1.35rem] bg-surface p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            Your rating
          </p>
          <StarRating
            value={rec?.myRating ?? 0}
            onChange={(n) => {
              if (!rec) track(kind, id, undefined, item.name, item.imageUrl);
              setRating(kind, id, n);
            }}
          />
          <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wide text-muted">
            Notes
          </p>
          <textarea
            className="min-h-28 w-full rounded-2xl border border-[var(--hairline)] bg-[var(--background)] p-3 text-sm outline-none focus:border-foreground/25"
            value={rec?.myReview ?? ""}
            onChange={(e) => {
              if (!rec) track(kind, id, undefined, item.name, item.imageUrl);
              setReview(kind, id, e.target.value);
            }}
          />
        </section>

        {state.displayName && rec && (
          <section className="rounded-[1.35rem] bg-surface p-4">
            <p className="font-display text-lg">Recommend to friends</p>
            <textarea
              className="mt-3 min-h-20 w-full rounded-2xl border border-[var(--hairline)] bg-[var(--background)] p-3 text-sm outline-none focus:border-foreground/25"
              placeholder="A short note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button
              type="button"
              className="btn-primary mt-3"
              style={{
                background: meta.hex,
                color: meta.onDark ? "#12141A" : "#fff",
              }}
              onClick={() => {
                recommend(kind, id, note, item.name);
                setNote("");
              }}
            >
              Post
            </button>
          </section>
        )}
        {!state.displayName && (
          <p className="px-1 text-sm text-muted">
            Sign in on <Link href="/friends" className="underline">Friends</Link>{" "}
            and set a display name to recommend titles.
          </p>
        )}
      </div>
    </div>
  );
}
