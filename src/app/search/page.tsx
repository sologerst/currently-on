"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Poster } from "@/components/MediaBits";
import { CATEGORY_META } from "@/lib/categories";
import { fetchCatalogSearch } from "@/lib/catalog-client";
import type { CatalogItem } from "@/lib/types";

function Results() {
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const [hits, setHits] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const groups = ["music", "tv", "movies", "podcasts", "books"] as const;

  useEffect(() => {
    let cancelled = false;
    if (!q.trim()) {
      setHits([]);
      return;
    }
    setLoading(true);
    void fetchCatalogSearch(q)
      .then((items) => {
        if (!cancelled) setHits(items);
      })
      .catch(() => {
        if (!cancelled) setHits([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [q]);

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="font-display text-2xl">Search</h1>
      <p className="font-mono text-sm text-black/45">{q || "Type in the bar"}</p>
      {loading && <p className="mt-4 text-sm text-black/45">Searching…</p>}
      {groups.map((kind) => {
        const list = hits.filter((h) => h.kind === kind);
        if (list.length === 0) return null;
        return (
          <section key={kind} className="mt-4">
            <h2
              className="font-display"
              style={{ color: CATEGORY_META[kind].hex }}
            >
              {CATEGORY_META[kind].label}
            </h2>
            <ul className="mt-2 space-y-2">
              {list.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/${item.kind}/${item.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-black/8 p-2"
                  >
                    <Poster
                      name={item.name}
                      kind={item.kind}
                      imageUrl={item.imageUrl}
                    />
                    <span>{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {q && !loading && hits.length === 0 && (
        <p className="mt-4 text-sm text-black/45">No matches.</p>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Results />
    </Suspense>
  );
}
