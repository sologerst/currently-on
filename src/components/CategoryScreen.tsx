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

function sourceLabel(source: string) {
  if (source === "tmdb") return "TMDb";
  if (source === "open-library") return "Open Library";
  if (source === "musicbrainz") return "MusicBrainz";
  return null;
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

  return (
    <article className="flex gap-3 py-3">
      <Link href={`/${kind}/${item.id}`} className="pressable shrink-0">
        <Poster name={item.name} kind={kind} imageUrl={item.imageUrl} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={`/${kind}/${item.id}`}
          className="block truncate font-display text-[1.05rem] leading-tight"
        >
          {item.name}
        </Link>
        {item.author && (
          <p className="mt-0.5 truncate text-xs text-muted">{item.author}</p>
        )}
        {metaBits.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {metaBits.slice(0, 4).map((bit) => (
              <Badge key={bit}>{bit}</Badge>
            ))}
          </div>
        )}
        {iso && (
          <p
            className="mt-1.5 font-mono text-[11px] font-medium"
            style={{ color: meta.hex }}
          >
            {item.nextLabel || "Release"} · {daysLabel(iso)}
          </p>
        )}
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary"
            style={{ background: meta.hex, color: meta.onDark ? "#12141A" : "#fff" }}
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
            className="btn-ghost"
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
    <div className="pb-4">
      <div
        className="px-4 pb-5 pt-4 text-white"
        style={{
          background: `linear-gradient(165deg, ${meta.hex} 0%, color-mix(in srgb, ${meta.hex} 70%, #0b1020) 100%)`,
          color: meta.onDark ? "#12141A" : "#fff",
        }}
      >
        <p
          className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-70"
          style={{ color: "inherit" }}
        >
          Currently On{live ? ` · ${live}` : ""}
        </p>
        <h1 className="mt-1 font-display text-[2.4rem] leading-none">
          {meta.label}
        </h1>
      </div>

      <div className="mx-auto max-w-lg space-y-5 px-4 pt-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${meta.label.toLowerCase()}`}
          className="field"
          enterKeyHint="search"
        />

        {loading && (
          <p className="animate-fade text-sm text-muted">Loading catalog…</p>
        )}

        {q.trim() && !loading && (
          <section className="divide-y divide-[var(--hairline)]">
            {searchHits.length === 0 && (
              <p className="py-4 text-sm text-muted">No matches.</p>
            )}
            {searchHits.map((item) => (
              <ItemRow key={item.id} item={item} kind={kind} />
            ))}
          </section>
        )}

        {!q.trim() && (
          <>
            <section>
              <h2 className="mb-3 font-display text-lg">Suggested</h2>
              <div className="scroll-x pb-1">
                {suggested.map((item) => (
                  <Link
                    key={item.id}
                    href={`/${kind}/${item.id}`}
                    className="pressable w-[5.5rem] shrink-0"
                  >
                    <Poster
                      name={item.name}
                      kind={kind}
                      imageUrl={item.imageUrl}
                    />
                    <p className="mt-1.5 truncate text-xs font-medium">
                      {item.name}
                    </p>
                  </Link>
                ))}
              </div>
            </section>

            {friendRecs.length > 0 && (
              <section>
                <h2 className="mb-3 font-display text-lg">From friends</h2>
                <div className="scroll-x mb-2">
                  {["all", ...friendNames].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
                        friendFilter === n
                          ? "bg-foreground text-white"
                          : "bg-[var(--surface-2)] text-muted"
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
                      <span className="font-display text-base">{r.itemName}</span>
                      <span className="shrink-0 text-xs text-muted">
                        {r.author}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {comingUp && (
              <section
                className="overflow-hidden rounded-[1.35rem] p-4"
                style={{
                  background: `linear-gradient(145deg, ${meta.hex}, color-mix(in srgb, ${meta.hex} 65%, #111))`,
                  color: meta.onDark ? "#12141A" : "#fff",
                }}
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-70">
                  Coming up next
                </p>
                <p className="mt-1 font-display text-2xl leading-tight">
                  {comingUp.name}
                </p>
                <p className="mt-1 font-mono text-sm opacity-80">
                  {comingUp.nextLabel || comingUp.releaseDate} ·{" "}
                  {daysLabel(upcomingIso(comingUp))}
                </p>
              </section>
            )}

            <section>
              <div className="mb-3 flex items-end justify-between gap-3">
                <h2 className="font-display text-lg">Your list</h2>
              </div>
              <div className="scroll-x mb-2 rounded-full bg-[var(--surface-2)] p-1">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                      tab === t.id
                        ? "bg-surface text-foreground shadow-sm"
                        : "text-muted"
                    }`}
                  >
                    {t.label}
                    <span className="ml-1 opacity-50">{counts[t.id] ?? 0}</span>
                  </button>
                ))}
              </div>
              <div className="divide-y divide-[var(--hairline)]">
                {trackedList.length === 0 && (
                  <p className="py-6 text-sm text-muted">
                    Nothing in this tab yet.
                  </p>
                )}
                {trackedList.map((item) => (
                  <ItemRow key={item.id} item={item} kind={kind} />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
