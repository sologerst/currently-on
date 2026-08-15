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

  useEffect(() => {
    let cancelled = false;
    void fetchUpcomingCatalog()
      .then((rows) => {
        if (!cancelled) setItems(rows.slice(0, 8));
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (items.length === 0) return null;
  return (
    <div className="border-b border-black/8 bg-white">
      <div className="mx-auto flex max-w-lg gap-2 overflow-x-auto px-3 py-2">
        <span className="shrink-0 self-center font-mono text-[10px] uppercase tracking-wider text-black/40">
          On deck
        </span>
        {items.map((item) => {
          const meta = CATEGORY_META[item.kind];
          const iso = upcomingIso(item);
          return (
            <Link
              key={`${item.kind}:${item.id}`}
              href={`/${item.kind}/${item.id}`}
              className="flex shrink-0 items-center gap-2 rounded-full border border-black/8 bg-[#F6F7F9] px-2 py-1"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: meta.hex }}
              />
              <span className="max-w-28 truncate text-xs">{item.name}</span>
              {iso !== "9999-12-31" && (
                <span className="font-mono text-[10px] text-black/45">
                  {daysUntil(iso)}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
