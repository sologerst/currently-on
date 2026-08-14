"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Poster } from "@/components/MediaBits";
import { CATEGORY_META, cycleStatus, lookItUpUrl, tabsFor } from "@/lib/categories";
import { getByKind, upcomingIso } from "@/lib/catalog";
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
        <Poster name={item.name} kind={kind} />
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
          {item.genres?.map((g) => (
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
              if (!rec) track(kind, item.id);
              else
                setStatus(
                  kind,
                  item.id,
                  cycleStatus(kind, rec.myStatus) as MyStatus,
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
  const catalog = getByKind(kind);
  const { state, getTracked } = useTracker();
  const tabs = tabsFor(kind);
  const [tab, setTab] = useState(tabs[0].id);
  const [q, setQ] = useState("");

  const trackedList = useMemo(() => {
    return catalog.filter((item) => {
      const rec = getTracked(kind, item.id);
      if (!rec) return false;
      if (tab === "recommended") return rec.myStatus === "recommended" || rec.recommendedBy;
      return rec.myStatus === tab;
    });
  }, [catalog, kind, tab, getTracked, state.tracked]);

  const counts = Object.fromEntries(
    tabs.map((t) => [
      t.id,
      catalog.filter((item) => {
        const rec = getTracked(kind, item.id);
        if (!rec) return false;
        if (t.id === "recommended")
          return rec.myStatus === "recommended" || Boolean(rec.recommendedBy);
        return rec.myStatus === t.id;
      }).length,
    ]),
  );

  const searchHits = catalog.filter((i) =>
    i.name.toLowerCase().includes(q.trim().toLowerCase()),
  );
  const suggested = catalog.slice(0, 6);
  const friendRecs = state.recommendations.filter(
    (r) =>
      r.itemKind === kind && !getTracked(kind, r.itemId),
  );
  const friendNames = [...new Set(friendRecs.map((r) => r.author))];
  const [friendFilter, setFriendFilter] = useState<string>("all");
  const shownFriendRecs =
    friendFilter === "all"
      ? friendRecs
      : friendRecs.filter((r) => r.author === friendFilter);

  const comingUp = catalog
    .filter((i) => upcomingIso(i) !== "9999-12-31")
    .sort((a, b) => upcomingIso(a).localeCompare(upcomingIso(b)))[0];

  return (
    <div>
      <div className="px-4 py-4 text-white" style={{ background: meta.hex }}>
        <p className="font-mono text-[10px] uppercase tracking-widest opacity-80">
          Currently On
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
        {q.trim() && (
          <div className="space-y-2">
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
                  ? { background: meta.hex, color: meta.onDark ? "#14161A" : "#fff" }
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
                <Poster name={item.name} kind={kind} />
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
