"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AvatarMark } from "@/components/AvatarMark";
import { CoverCard, PlatformMark, Poster, StarRating } from "@/components/MediaBits";
import { SectionRule } from "@/components/SectionRule";
import { CATEGORY_META, MEDIA_KINDS } from "@/lib/categories";
import { fetchCatalogBrowse } from "@/lib/catalog-client";
import { ratingLabel } from "@/lib/ratings";
import { useTracker } from "@/lib/tracker";
import type { CatalogItem, CategoryKind } from "@/lib/types";

const HOME_TABS: CategoryKind[] = ["movies", "tv", "podcasts", "music"];

export function HomeScreen() {
  const { state } = useTracker();
  const [kind, setKind] = useState<CategoryKind>("movies");
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loadedKind, setLoadedKind] = useState<CategoryKind | null>(null);
  const loading = loadedKind !== kind;

  useEffect(() => {
    let cancelled = false;
    void fetchCatalogBrowse(kind)
      .then(({ items }) => {
        if (!cancelled) setCatalog(items);
      })
      .catch(() => {
        if (!cancelled) setCatalog([]);
      })
      .finally(() => {
        if (!cancelled) setLoadedKind(kind);
      });
    return () => {
      cancelled = true;
    };
  }, [kind]);

  const featured = catalog[0];
  const friendsWatching = useMemo(() => {
    const recs = state.recommendations.filter((r) => r.itemKind === kind);
    const pool = recs.length > 0 ? recs : state.recommendations;
    return pool.slice(0, 8).map((r) => {
      const hit = catalog.find((c) => c.id === r.itemId);
      return {
        rec: r,
        item: hit ?? {
          id: r.itemId,
          kind: r.itemKind,
          name: r.itemName,
        },
      };
    });
  }, [state.recommendations, kind, catalog]);

  const favorites = useMemo(() => {
    const tracked = Object.values(state.tracked)
      .filter((t) => t.kind === kind)
      .slice(0, 8)
      .map((t) => {
        const hit = catalog.find((c) => c.id === t.itemId);
        return (
          hit ?? {
            id: t.itemId,
            kind: t.kind,
            name: t.itemName || t.itemId,
            imageUrl: t.imageUrl,
            rating: t.myRating || undefined,
          }
        );
      });
    if (tracked.length >= 3) return tracked;
    return catalog.slice(1, 7);
  }, [state.tracked, kind, catalog]);

  const isMusic = kind === "music";
  const coverVariant = isMusic ? "album" : "wide";

  return (
    <div className="mx-auto max-w-lg px-4 pb-8 pt-3">
      <h1 className="font-display text-[1.85rem] font-semibold italic leading-none tracking-wide">
        What&apos;s Hot Now:
      </h1>

      <nav className="mt-4 flex items-baseline justify-between gap-2">
        {HOME_TABS.map((tab) => (
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

      <section className="mt-5">
        {loading && !featured ? (
          <div className="aspect-video animate-pulse rounded-[18px] bg-white/5" />
        ) : featured ? (
          <FeaturedBlock item={featured} />
        ) : (
          <p className="py-8 text-sm text-muted">Catalog is quiet right now.</p>
        )}
      </section>

      {friendsWatching.length > 0 && (
        <section className="mt-7">
          <SectionRule>What friends are watching</SectionRule>
          <div className="scroll-x mt-4 pb-1">
            {friendsWatching.map(({ rec, item }) => (
              <Link
                key={rec.id}
                href={`/${item.kind}/${item.id}`}
                className="pressable w-[11.2rem] shrink-0"
              >
                <div className="mb-2 flex items-center gap-2">
                  <AvatarMark size="sm" />
                  <span className="truncate font-display text-xs font-light tracking-wide text-white/90">
                    {rec.author}
                  </span>
                </div>
                <CoverCard
                  name={item.name}
                  kind={item.kind}
                  imageUrl={item.imageUrl}
                  rating={item.rating}
                  variant={coverVariant}
                />
                <div className="mt-2 flex items-start justify-between gap-2">
                  <p className="truncate font-display text-xs font-medium tracking-wide">
                    {item.name}
                  </p>
                  <PlatformMark platform={item.platform} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6">
        <SectionRule>Favorites:</SectionRule>
        <div className="scroll-x mt-4 pb-1">
          {favorites.map((item) => (
            <Link
              key={`${item.kind}:${item.id}`}
              href={`/${item.kind}/${item.id}`}
              className="pressable w-[11.2rem] shrink-0"
            >
              <CoverCard
                name={item.name}
                kind={item.kind}
                imageUrl={item.imageUrl}
                rating={item.rating}
                variant={coverVariant}
              />
              <div className="mt-2 flex items-start justify-between gap-2">
                <p className="truncate font-display text-xs font-medium tracking-wide">
                  {item.name}
                </p>
                <PlatformMark platform={item.platform} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8 grid grid-cols-5 gap-2">
        {MEDIA_KINDS.map((k) => (
          <Link
            key={k}
            href={CATEGORY_META[k].href}
            className="pressable py-2 text-center font-display text-[10px] font-light uppercase tracking-[0.12em] text-white/55"
          >
            {CATEGORY_META[k].tab}
          </Link>
        ))}
      </section>
    </div>
  );
}

function FeaturedBlock({ item }: { item: CatalogItem }) {
  const score = ratingLabel(item.rating);
  const music = item.kind === "music";

  if (music) {
    return (
      <Link href={`/${item.kind}/${item.id}`} className="pressable block">
        <div className="flex gap-4">
          <Poster
            name={item.name}
            kind={item.kind}
            imageUrl={item.imageUrl}
            variant="lg"
          />
          <div className="min-w-0 flex-1 pt-1">
            {score && (
              <p className="font-display text-5xl font-semibold leading-none">{score}</p>
            )}
            <StarRating value={item.rating ?? 0} size="sm" />
            <p className="mt-4 font-display text-[11px] font-light uppercase tracking-[0.18em] text-white/70">
              Platform:
            </p>
            <p className="mt-1 font-display text-xs font-light uppercase tracking-[0.14em] text-white/85">
              {item.platform || "Look it up"}
            </p>
          </div>
        </div>
        <p className="mt-3 font-display text-lg font-medium leading-tight tracking-wide">
          {item.name}
        </p>
        {item.author && (
          <p className="mt-0.5 font-display text-sm font-light text-white/70">
            {item.author}
          </p>
        )}
      </Link>
    );
  }

  return (
    <Link href={`/${item.kind}/${item.id}`} className="pressable block">
      <Poster
        name={item.name}
        kind={item.kind}
        imageUrl={item.imageUrl}
        variant="hero"
      />
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-lg font-medium leading-tight tracking-wide">
            {item.name}
          </p>
          <p className="mt-1 font-display text-[10px] font-light uppercase tracking-[0.16em] text-white/55">
            {item.genre || item.genres?.[0] || item.nextLabel || "Featured"}
            {item.releaseDate ? ` · ${item.releaseDate}` : ""}
          </p>
        </div>
        <div className="shrink-0 text-right">
          {score && (
            <div className="flex items-center justify-end gap-1.5">
              <StarRating value={item.rating ?? 0} size="sm" />
              <span className="font-display text-sm font-semibold">{score}</span>
            </div>
          )}
          <p className="mt-1 font-display text-[10px] font-light uppercase tracking-[0.14em] text-white/55">
            Where to watch
          </p>
          <PlatformMark platform={item.platform} />
        </div>
      </div>
    </Link>
  );
}
