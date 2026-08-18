"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CATEGORY_META } from "@/lib/categories";
import { upcomingIso } from "@/lib/catalog";
import { fetchUpcomingCatalog } from "@/lib/catalog-client";
import type { CatalogItem } from "@/lib/types";

function daysUntil(iso: string) {
  const t = new Date(iso + "T00:00:00").getTime();
  const d = Math.ceil((t - Date.now()) / 86400000);
  if (d <= 0) return "today";
  if (d === 1) return "1d";
  return `${d}d`;
}

export function OnDeckTicker() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchUpcomingCatalog()
      .then((rows) => {
        if (!cancelled) setItems(rows.slice(0, 8));
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return null;

  return (
    <div className="border-b border-white/10 bg-transparent">
      <div className="scroll-x mx-auto max-w-lg items-center px-3 py-2.5">
        <span className="shrink-0 font-display text-[10px] font-light uppercase tracking-[0.18em] text-muted">
          On deck
        </span>
        {items.length === 0 ? (
          <span className="text-xs text-muted">Nothing scheduled right now</span>
        ) : (
          items.map((item) => {
            const meta = CATEGORY_META[item.kind];
            const iso = upcomingIso(item);
            return (
              <Link
                key={`${item.kind}:${item.id}`}
                href={`/${item.kind}/${item.id}`}
                className="pressable flex shrink-0 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-2.5 py-1.5"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: meta.hex }}
                />
                <span className="max-w-28 truncate font-display text-xs font-medium tracking-wide">
                  {item.name}
                </span>
                {iso !== "9999-12-31" && (
                  <span className="font-display text-[10px] font-light text-muted">
                    {daysUntil(iso)}
                  </span>
                )}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
