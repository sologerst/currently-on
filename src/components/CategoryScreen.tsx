"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge, Poster } from "@/components/MediaBits";
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

function ItemCard({ item, kind }: { item: CatalogItem; kind: CategoryKind }) {
  const meta = CATEGORY_META[kind];
  const { getTracked, setStatus, track } = useTracker();
  const rec = getTracked(kind, item.id);
  const iso = upcomingIso(item) === "9999-12-31" ? undefined : upcomingIso(item);

  return (
    <article className="flex gap-3 rounded-2xl border border-black/8 bg-[#F6F7F9] p-3">
      <Link href={`/${kind}/${item.id}`}>
        <Poster name={item.name} kind={kind} imageUrl={item.imageUrl} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/${kind}/${item.id}`} className="font-display text-base">
          {item.name}
        </Link>
        {item.author && (
          <p className="text-xs text-black/50">{item.author}</p>
        )}
        <div className="mt-1 flex flex-wrap gap-1">
          {item.seasonCount ? <Badge>{item.seasonCount} seasons</Badge> : null}
          {item.runningStatus ? <Badge>{item.runningStatus}</Badge> : null}
          {item.rating ? <Badge>{item.rating}</Badge> : null}
          {item.platform ? <Badge>{item.platform}</Badge> : null}
          {item.genre ? <Badge>{item.genre}</Badge> : null}
          {item.genres?.slice(0, 3).map((g) => (
            <Badge key={g}>{g}</Badge>
          ))}
          {item.notYetStreaming ? <Badge>not yet streaming</Badge> : null}
          {rec?.recommendedBy ? (
            <Badge>Recommended by {rec.recommendedBy}</Badge>
          ) : null}
        </div>
        {iso && (
          <p className="mt-1 font-mono text-[11px]" style={{ color: meta.hex }}>
            {item.nextLabel || "Release"} · {daysLabel(iso)}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full px-3 py-1 text-xs text-white"
            style={{ background: meta.hex }}
            onClick={() => {
              if (!rec) track(kind, item.id, undefined, item.name);
              else
                setStatus(
                  kind,
                  item.id,
                  cycleStatus(kind, rec.myStatus) as MyStatus,
                  item.name,
                );
            }}
          >
            {rec ? rec.myStatus.replace("-", " ") : "Track"}
          </button>
          <a
            href={lookItUpUrl(item.name)}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-black/10 px-3 py-1 text-xs"
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

  // Resolve tracked titles that aren't in the current browse/search page.
  useEffect(() => {
    let cancelled = false;
    const trackedIds = Object.values(state.tracked)
      .filter((t) => t.kind === kind)
      .map((t) => t.itemId);
    const known = new Set(catalog.map((c) => c.id));
    const missing = trackedIds.filter((id) => !known.has(id));
    if (missing.length === 0) return;
    void Promise.all(missing.map((id) => fetchCatalogItem(kind, id))).then(
      (rows) => {
        if (cancelled) return;
        setTrackedExtras(rows.filter(Boolean) as CatalogItem[]);
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
      if (item.kind === kind && !map.has(item.id)) map.set(item.id, item);
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
      .map((t) => byId.get(t.itemId))
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
  const suggested = catalog.slice(0, 6);
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

  return (
    <div>
      <div className="px-4 py-4 text-white" style={{ background: meta.hex }}>
        <p className="font-mono text-[10px] uppercase tracking-widest opacity-80">
          Currently On
          {source === "tmdb"
            ? " · TMDb"
            : source === "open-library"
              ? " · Open Library"
              : source === "musicbrainz"
                ? " · MusicBrainz"
                : ""}
        </p>
        <h1 className="font-display text-3xl">{meta.label}</h1>
      </div>
      <div className="mx-auto max-w-lg space-y-4 px-3 py-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${meta.label.toLowerCase()}`}
          className="w-full rounded-xl border border-black/10 bg-[#F6F7F9] px-3 py-2 text-sm"
        />
        {loading && (
          <p className="text-sm text-black/45">Loading catalog…</p>
        )}
        {q.trim() && !loading && (
          <div className="space-y-2">
            {searchHits.length === 0 && (
              <p className="text-sm text-black/45">No matches.</p>
            )}
            {searchHits.map((item) => (
              <ItemCard key={item.id} item={item} kind={kind} />
            ))}
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className="shrink-0 rounded-full px-3 py-1.5 text-xs"
              style={
                tab === t.id
                  ? {
                      background: meta.hex,
                      color: meta.onDark ? "#14161A" : "#fff",
                    }
                  : { background: "#F6F7F9", color: "#14161A" }
              }
            >
              {t.label} {counts[t.id] ?? 0}
            </button>
          ))}
        </div>

        <section>
          <h2 className="mb-2 font-display">Suggested</h2>
          <div className="flex gap-2 overflow-x-auto">
            {suggested.map((item) => (
              <Link
                key={item.id}
                href={`/${kind}/${item.id}`}
                className="w-24 shrink-0"
              >
                <Poster
                  name={item.name}
                  kind={kind}
                  imageUrl={item.imageUrl}
                />
                <p className="mt-1 truncate text-xs">{item.name}</p>
              </Link>
            ))}
          </div>
        </section>

        {friendRecs.length > 0 && (
          <section>
            <h2 className="mb-2 font-display">Recommended by friends</h2>
            <div className="mb-2 flex gap-2 overflow-x-auto">
              <button
                type="button"
                className="rounded-full border px-3 py-1 text-xs"
                onClick={() => setFriendFilter("all")}
              >
                All
              </button>
              {friendNames.map((n) => (
                <button
                  key={n}
                  type="button"
                  className="rounded-full border px-3 py-1 text-xs"
                  onClick={() => setFriendFilter(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {shownFriendRecs.map((r) => (
                <Link
                  key={r.id}
                  href={`/${kind}/${r.itemId}`}
                  className="block rounded-xl border border-black/8 bg-[#F6F7F9] px-3 py-2 text-sm"
                >
                  <span className="font-display">{r.itemName}</span>
                  <span className="text-black/45"> · {r.author}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {comingUp && (
          <section
            className="rounded-2xl p-4 text-white"
            style={{ background: meta.hex }}
          >
            <p className="font-mono text-[10px] uppercase tracking-widest opacity-80">
              Coming up next
            </p>
            <p className="font-display text-xl">{comingUp.name}</p>
            <p className="font-mono text-sm">
              {comingUp.nextLabel || comingUp.releaseDate} ·{" "}
              {daysLabel(upcomingIso(comingUp))}
            </p>
          </section>
        )}

        <section className="space-y-2">
          <h2 className="font-display">Your list</h2>
          {trackedList.length === 0 && (
            <p className="text-sm text-black/45">Nothing in this tab yet.</p>
          )}
          {trackedList.map((item) => (
            <ItemCard key={item.id} item={item} kind={kind} />
          ))}
        </section>
      </div>
    </div>
  );
}
