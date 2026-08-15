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
  const [item, setItem] = useState<CatalogItem | null>(seed ?? null);
  const [loading, setLoading] = useState(!seed);
  const meta = CATEGORY_META[kind];
  const { getTracked, track, setRating, setReview, recommend, state } =
    useTracker();
  const rec = getTracked(kind, id);
  const [note, setNote] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (seed) {
      setItem(seed);
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetchCatalogItem(kind, id)
      .then((row) => {
        if (!cancelled) setItem(row);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [kind, id, seed]);

  if (loading) return <p className="p-4 text-sm text-black/45">Loading…</p>;
  if (!item) return <p className="p-4">Not found.</p>;

  return (
    <div>
      <div className="px-4 py-5 text-white" style={{ background: meta.hex }}>
        <Link href={`/${kind}`} className="text-sm opacity-80">
          ← {meta.label}
        </Link>
        <h1 className="mt-2 font-display text-3xl">{item.name}</h1>
      </div>
      <div className="mx-auto max-w-lg space-y-4 px-3 py-4">
        <div className="flex gap-4">
          <Poster
            name={item.name}
            kind={kind}
            large
            imageUrl={item.imageUrl}
          />
          <div className="space-y-2">
            {item.author && <p className="text-sm">{item.author}</p>}
            <div className="flex flex-wrap gap-1">
              {item.seasonCount ? <Badge>{item.seasonCount} seasons</Badge> : null}
              {item.runningStatus ? <Badge>{item.runningStatus}</Badge> : null}
              {item.rating ? <Badge>Community {item.rating}</Badge> : null}
              {item.platform ? <Badge>{item.platform}</Badge> : null}
              {item.genre ? <Badge>{item.genre}</Badge> : null}
              {item.genres?.map((g) => (
                <Badge key={g}>{g}</Badge>
              ))}
            </div>
            {!rec && (
              <button
                type="button"
                className="rounded-full px-3 py-1 text-sm text-white"
                style={{ background: meta.hex }}
                onClick={() => track(kind, id, undefined, item.name)}
              >
                Add to my list
              </button>
            )}
            <a
              className="block text-sm underline"
              href={lookItUpUrl(item.name)}
              target="_blank"
              rel="noreferrer"
            >
              Look it up
            </a>
          </div>
        </div>

        <section className="rounded-2xl border border-black/8 bg-[#F6F7F9] p-3">
          <p className="mb-1 text-xs text-black/45">Your rating</p>
          <StarRating
            value={rec?.myRating ?? 0}
            onChange={(n) => {
              if (!rec) track(kind, id, undefined, item.name);
              setRating(kind, id, n);
            }}
          />
          <p className="mb-1 mt-3 text-xs text-black/45">Notes</p>
          <textarea
            className="min-h-24 w-full rounded-xl border border-black/10 bg-white p-2 text-sm"
            value={rec?.myReview ?? ""}
            onChange={(e) => {
              if (!rec) track(kind, id, undefined, item.name);
              setReview(kind, id, e.target.value);
            }}
          />
        </section>

        {state.displayName && rec && (
          <section className="rounded-2xl border border-black/8 p-3">
            <p className="font-display">Recommend to friends</p>
            <textarea
              className="mt-2 min-h-16 w-full rounded-xl border border-black/10 bg-[#F6F7F9] p-2 text-sm"
              placeholder="A short note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button
              type="button"
              className="mt-2 rounded-full px-3 py-1 text-sm text-white"
              style={{ background: meta.hex }}
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
          <p className="text-sm text-black/45">
            Sign in on <Link href="/friends">Friends</Link> and set a display
            name to recommend titles.
          </p>
        )}
      </div>
    </div>
  );
}
