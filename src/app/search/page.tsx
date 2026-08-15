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
    const query = q.trim();
    if (!query) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const items = await fetchCatalogSearch(query);
        if (!cancelled) setHits(items);
      } catch {
        if (!cancelled) setHits([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q]);

  const shown = q.trim() ? hits : [];

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="font-display text-[2.4rem] leading-none">Search</h1>
      <p className="mt-2 font-mono text-sm text-muted">
        {q || "Type in the bar above"}
      </p>
      {loading && <p className="mt-4 text-sm text-muted">Searching…</p>}
      {groups.map((kind) => {
        const list = shown.filter((h) => h.kind === kind);
        if (list.length === 0) return null;
        return (
          <section key={kind} className="mt-6">
            <h2
              className="font-display text-lg"
              style={{ color: CATEGORY_META[kind].hex }}
            >
              {CATEGORY_META[kind].label}
            </h2>
            <ul className="mt-2 divide-y divide-[var(--hairline)]">
              {list.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/${item.kind}/${item.id}`}
                    className="pressable flex items-center gap-3 py-3"
                  >
                    <Poster
                      name={item.name}
                      kind={item.kind}
                      imageUrl={item.imageUrl}
                    />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {q.trim() && !loading && shown.length === 0 && (
        <p className="mt-4 text-sm text-muted">No matches.</p>
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
