"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge, CoverCard, PlatformMark } from "@/components/MediaBits";
import { SectionRule } from "@/components/SectionRule";
import { CATEGORY_META, cycleStatus, lookItUpUrl, tabsFor } from "@/lib/categories";
import { upcomingIso } from "@/lib/catalog";
import { fetchCatalogBrowse, fetchCatalogItem } from "@/lib/catalog-client";
import { useTracker } from "@/lib/tracker";
import type { CatalogItem, CategoryKind, MyStatus } from "@/lib/types";

function daysLabel(iso?: string) {
  if (!iso) return null;
  const d = Math.ceil(
    (new Date(iso + "T00:00:00").getTime() - Date.now()) / 86400000,
  );
  if (d < 0) return "aired";
  if (d === 0) return "today";
  return `${d} days`;
}

function sourceLabel(source: string) {
  if (source === "tmdb") return "TMDb";
  if (source === "open-library") return "Open Library";
  if (source === "musicbrainz") return "MusicBrainz";
  if (source === "itunes") return "Apple Podcasts";
  if (source === "seed-fallback") return "Demo catalog";
  if (source === "seed") return "Demo catalog";
  return null;
}

function isLiveCatalogId(id: string) {
  return (
    id.startsWith("tmdb-") ||
    id.startsWith("mb-") ||
    id.startsWith("ol-") ||
    id.startsWith("itunes-")
  );
}

function ItemRow({ item, kind }: { item: CatalogItem; kind: CategoryKind }) {
  const meta = CATEGORY_META[kind];
  const { getTracked, setStatus, track } = useTracker();
  const rec = getTracked(kind, item.id);
  const iso = upcomingIso(item) === "9999-12-31" ? undefined : upcomingIso(item);
  const metaBits = [
    item.seasonCount ? `${item.seasonCount} seasons` : null,
    item.runningStatus,
    item.rating ? String(item.rating) : null,
    item.platform,
    item.genre,
    ...(item.genres?.slice(0, 2) ?? []),
    item.notYetStreaming ? "not yet streaming" : null,
    rec?.recommendedBy ? `via ${rec.recommendedBy}` : null,
  ].filter(Boolean) as string[];
  const cover = kind === "music" || kind === "podcasts" ? "album" : "wide";

  return (
    <article className="flex items-center gap-3 py-3">
      <Link href={`/${kind}/${item.id}`} className="pressable shrink-0">
        <CoverCard
          name={item.name}
          kind={kind}
          imageUrl={item.imageUrl}
          rating={item.rating}
          variant={cover}
        />
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={`/${kind}/${item.id}`}
          className="block truncate font-display text-[1.05rem] font-medium leading-tight tracking-wide"
        >
          {item.name}
        </Link>
        {item.author && (
          <p className="mt-0.5 truncate font-display text-xs font-light text-muted">
            {item.author}
          </p>
        )}
        {metaBits.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {metaBits.slice(0, 3).map((bit) => (
              <Badge key={bit}>{bit}</Badge>
            ))}
          </div>
        )}
        {iso && (
          <p className="mt-1.5 font-display text-[11px] font-light uppercase tracking-[0.14em] text-[var(--gold)]">
            {item.nextLabel || "Release"} · {daysLabel(iso)}
          </p>
        )}
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary"
            style={{
              background: meta.hex,
              color: meta.onDark ? "#12141A" : "#fff",
            }}
            onClick={() => {
              if (!rec)
                track(kind, item.id, undefined, item.name, item.imageUrl);
              else
                setStatus(
                  kind,
                  item.id,
                  cycleStatus(kind, rec.myStatus) as MyStatus,
                  item.name,
                  item.imageUrl,
                );
            }}
          >
            {rec ? rec.myStatus.replace("-", " ") : "Track"}
          </button>
          <a
            href={lookItUpUrl(item.name)}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost !px-3 !py-1.5 !text-[10px]"
          >
            Look it up
          </a>
        </div>
      </div>
    </article>
  );
}

export function CategoryScreen({ kind }: { kind: CategoryKind }) {
  const meta = CATEGORY_META[kind];
  const { state, getTracked } = useTracker();
  const tabs = tabsFor(kind);
  const [tab, setTab] = useState(tabs[0].id);
  const [q, setQ] = useState("");
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [trackedExtras, setTrackedExtras] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<string>("");
  const cover = kind === "music" || kind === "podcasts" ? "album" : "wide";

  useEffect(() => {
    let cancelled = false;
    const handle = window.setTimeout(() => {
      setLoading(true);
      void fetchCatalogBrowse(kind, q)
        .then(({ items, source: src }) => {
          if (cancelled) return;
          setCatalog(items);
          setSource(src);
        })
        .catch(() => {
          if (!cancelled) setCatalog([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, q.trim() ? 250 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [kind, q]);

  useEffect(() => {
    let cancelled = false;
    const inCatalog = new Map(catalog.map((c) => [c.id, c]));
    const missing = Object.values(state.tracked)
      .filter((t) => t.kind === kind)
      .filter((t) => {
        if (!isLiveCatalogId(t.itemId)) return false;
        if (t.imageUrl) return false;
        const hit = inCatalog.get(t.itemId);
        if (hit?.imageUrl) return false;
        return !hit || !hit.imageUrl;
      })
      .map((t) => t.itemId);

    if (missing.length === 0) return;
    void Promise.all(missing.map((id) => fetchCatalogItem(kind, id))).then(
      (rows) => {
        if (cancelled) return;
        const next = rows.filter(Boolean) as CatalogItem[];
        if (next.length === 0) return;
        setTrackedExtras((prev) => {
          const map = new Map(prev.map((p) => [p.id, p]));
          for (const row of next) map.set(row.id, row);
          return [...map.values()];
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [state.tracked, catalog, kind]);

  const byId = useMemo(() => {
    const map = new Map<string, CatalogItem>();
    for (const item of catalog) map.set(item.id, item);
    for (const item of trackedExtras) {
      if (item.kind !== kind) continue;
      const prev = map.get(item.id);
      map.set(
        item.id,
        prev
          ? {
              ...prev,
              ...item,
              imageUrl: item.imageUrl || prev.imageUrl,
            }
          : item,
      );
    }
    return map;
  }, [catalog, trackedExtras, kind]);

  const trackedList = useMemo(() => {
    return Object.values(state.tracked)
      .filter((t) => t.kind === kind)
      .filter((t) => {
        if (tab === "recommended")
          return t.myStatus === "recommended" || Boolean(t.recommendedBy);
        return t.myStatus === tab;
      })
      .map((t) => {
        const hit = byId.get(t.itemId);
        if (hit) {
          return {
            ...hit,
            name: hit.name || t.itemName || hit.name,
            imageUrl: hit.imageUrl || t.imageUrl,
          };
        }
        if (t.itemName || t.imageUrl) {
          return {
            id: t.itemId,
            kind: t.kind,
            name: t.itemName || t.itemId,
            imageUrl: t.imageUrl,
          } satisfies CatalogItem;
        }
        return null;
      })
      .filter(Boolean) as CatalogItem[];
  }, [state.tracked, kind, tab, byId]);

  const counts = Object.fromEntries(
    tabs.map((t) => [
      t.id,
      Object.values(state.tracked).filter((rec) => {
        if (rec.kind !== kind) return false;
        if (t.id === "recommended")
          return rec.myStatus === "recommended" || Boolean(rec.recommendedBy);
        return rec.myStatus === t.id;
      }).length,
    ]),
  );

  const searchHits = catalog;
  const suggested = catalog.slice(0, 8);
  const friendRecs = state.recommendations.filter(
    (r) => r.itemKind === kind && !getTracked(kind, r.itemId),
  );
  const friendNames = [...new Set(friendRecs.map((r) => r.author))];
  const [friendFilter, setFriendFilter] = useState<string>("all");
  const shownFriendRecs =
    friendFilter === "all"
      ? friendRecs
      : friendRecs.filter((r) => r.author === friendFilter);

  const comingUp = [...catalog, ...trackedExtras]
    .filter((i) => upcomingIso(i) !== "9999-12-31")
    .sort((a, b) => upcomingIso(a).localeCompare(upcomingIso(b)))[0];

  const live = sourceLabel(source);

  return (
    <div className="mx-auto max-w-lg px-4 pb-6 pt-3">
      <p className="font-display text-[10px] font-light uppercase tracking-[0.22em] text-white/50">
        Always On{live ? ` · ${live}` : ""}
      </p>
      <h1 className="mt-1 font-display text-[2.4rem] font-semibold italic leading-none tracking-wide">
        {meta.tab}
      </h1>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={`Search ${meta.label.toLowerCase()}`}
        className="field mt-5"
        enterKeyHint="search"
      />

      {loading && (
        <p className="animate-fade mt-4 text-sm text-muted">Loading catalog…</p>
      )}

      {q.trim() && !loading && (
        <section className="mt-4 divide-y divide-white/10">
          {searchHits.length === 0 && (
            <div className="py-6">
              <p className="font-display text-lg">No matches</p>
              <p className="mt-1 text-sm text-muted">
                Try another spelling, or clear search to browse suggested
                titles.
              </p>
            </div>
          )}
          {searchHits.map((item) => (
            <ItemRow key={item.id} item={item} kind={kind} />
          ))}
        </section>
      )}

      {!q.trim() && (
        <div className="mt-6 space-y-6">
          <section>
            <SectionRule>Suggested</SectionRule>
            {loading ? null : suggested.length === 0 ? (
              <p className="py-4 text-sm text-muted">
                Catalog is quiet right now — try searching, or check back
                shortly.
              </p>
            ) : (
              <div className="scroll-x mt-4 pb-1">
                {suggested.map((item) => (
                  <Link
                    key={item.id}
                    href={`/${kind}/${item.id}`}
                    className="pressable w-[11.2rem] shrink-0"
                  >
                    <CoverCard
                      name={item.name}
                      kind={kind}
                      imageUrl={item.imageUrl}
                      rating={item.rating}
                      variant={cover}
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
            )}
          </section>

          {friendRecs.length > 0 && (
            <section>
              <SectionRule>From friends</SectionRule>
              <div className="scroll-x mt-3 mb-2">
                {["all", ...friendNames].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`shrink-0 rounded-full px-3 py-1.5 font-display text-xs font-light uppercase tracking-[0.14em] ${
                      friendFilter === n
                        ? "bg-white text-black"
                        : "bg-white/8 text-white/60"
                    }`}
                    onClick={() => setFriendFilter(n)}
                  >
                    {n === "all" ? "Everyone" : n}
                  </button>
                ))}
              </div>
              <div className="space-y-1">
                {shownFriendRecs.map((r) => (
                  <Link
                    key={r.id}
                    href={`/${kind}/${r.itemId}`}
                    className="pressable flex items-baseline justify-between gap-3 py-2.5"
                  >
                    <span className="font-display text-base tracking-wide">
                      {r.itemName}
                    </span>
                    <span className="shrink-0 font-display text-xs font-light text-muted">
                      {r.author}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {comingUp && (
            <section>
              <SectionRule>Coming up next</SectionRule>
              <Link
                href={`/${kind}/${comingUp.id}`}
                className="pressable mt-4 block"
              >
                <CoverCard
                  name={comingUp.name}
                  kind={kind}
                  imageUrl={comingUp.imageUrl}
                  rating={comingUp.rating}
                  variant="hero"
                />
                <p className="mt-3 font-display text-2xl font-medium leading-tight tracking-wide">
                  {comingUp.name}
                </p>
                <p className="mt-1 font-display text-sm font-light uppercase tracking-[0.12em] text-white/60">
                  {comingUp.nextLabel || comingUp.releaseDate} ·{" "}
                  {daysLabel(upcomingIso(comingUp))}
                </p>
              </Link>
            </section>
          )}

          <section>
            <SectionRule>Your list</SectionRule>
            <div className="scroll-x mt-3 mb-2">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 font-display text-xs font-light uppercase tracking-[0.12em] ${
                    tab === t.id
                      ? "bg-white text-black"
                      : "text-white/50"
                  }`}
                >
                  {t.label}
                  <span className="ml-1 opacity-50">{counts[t.id] ?? 0}</span>
                </button>
              ))}
            </div>
            <div className="divide-y divide-white/10">
              {trackedList.length === 0 && (
                <div className="py-6">
                  <p className="font-display text-base">Nothing here yet</p>
                  <p className="mt-1 text-sm text-muted">
                    Track a title from Suggested, or add one a friend
                    recommended.
                  </p>
                </div>
              )}
              {trackedList.map((item) => (
                <ItemRow key={item.id} item={item} kind={kind} />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
