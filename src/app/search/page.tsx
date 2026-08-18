"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CoverCard } from "@/components/MediaBits";
import { SectionRule } from "@/components/SectionRule";
import { CATEGORY_META } from "@/lib/categories";
import { fetchCatalogSearch } from "@/lib/catalog-client";
import type { CatalogItem } from "@/lib/types";

function Results() {
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const query = q.trim();
  const [hits, setHits] = useState<CatalogItem[]>([]);
  const [resolvedQuery, setResolvedQuery] = useState("");
  const groups = ["music", "tv", "movies", "podcasts", "books"] as const;
  const loading = query !== "" && resolvedQuery !== query;

  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    void (async () => {
      try {
        const items = await fetchCatalogSearch(query);
        if (!cancelled) setHits(items);
      } catch {
        if (!cancelled) setHits([]);
      } finally {
        if (!cancelled) setResolvedQuery(query);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query]);

  const shown = query ? hits : [];

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="font-display text-[2.4rem] font-semibold italic leading-none">
        Search
      </h1>
      <p className="mt-2 font-display text-sm font-light uppercase tracking-[0.16em] text-muted">
        {q || "Type in the menu search"}
      </p>
      {!q.trim() && (
        <p className="mt-8 text-sm leading-relaxed text-muted">
          Search across music, TV, movies, podcasts, and books. Results are
          ranked by how closely titles and creators match.
        </p>
      )}
      {loading && <p className="mt-4 text-sm text-muted">Searching…</p>}
      {groups.map((kind) => {
        const list = shown.filter((h) => h.kind === kind);
        if (list.length === 0) return null;
        return (
          <section key={kind} className="mt-6">
            <SectionRule>{CATEGORY_META[kind].tab}</SectionRule>
            <ul className="mt-3 divide-y divide-white/10">
              {list.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/${item.kind}/${item.id}`}
                    className="pressable flex items-center gap-3 py-3"
                  >
                    <CoverCard
                      name={item.name}
                      kind={item.kind}
                      imageUrl={item.imageUrl}
                      rating={item.rating}
                      variant="sm"
                    />
                    <div className="min-w-0">
                      <span className="block truncate font-display font-medium tracking-wide">
                        {item.name}
                      </span>
                      {item.author && (
                        <span className="block truncate font-display text-xs font-light text-muted">
                          {item.author}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {q.trim() && !loading && shown.length === 0 && (
        <div className="mt-8 space-y-2">
          <p className="font-display text-lg">No matches for “{q.trim()}”</p>
          <p className="text-sm leading-relaxed text-muted">
            Try a shorter title, an artist or author name, or browse a category
            from Home.
          </p>
        </div>
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
