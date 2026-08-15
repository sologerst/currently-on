import { NextResponse } from "next/server";
import {
  browseTmdb,
  getTmdbItem,
  isTmdbConfigured,
  searchTmdb,
  searchTmdbMulti,
  upcomingTmdbTv,
} from "@/lib/providers/tmdb";
import {
  getByKind,
  getItem,
  searchCatalog,
  upcomingItems,
} from "@/lib/catalog";
import type { CatalogItem, CategoryKind } from "@/lib/types";

const LIVE: CategoryKind[] = ["tv", "movies"];

function isLive(kind: string): kind is "tv" | "movies" {
  return kind === "tv" || kind === "movies";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") ?? "browse";
  const kind = searchParams.get("kind") ?? "";
  const q = searchParams.get("q") ?? "";
  const id = searchParams.get("id") ?? "";

  try {
    if (action === "item") {
      if (!kind || !id) {
        return NextResponse.json({ error: "kind and id required" }, { status: 400 });
      }
      if (isLive(kind) && isTmdbConfigured()) {
        const live = await getTmdbItem(kind, id);
        if (live) return NextResponse.json({ item: live });
      }
      const seed = getItem(kind as CategoryKind, id);
      return NextResponse.json({ item: seed ?? null });
    }

    if (action === "search") {
      const seedHits = searchCatalog(q);
      let liveHits: CatalogItem[] = [];
      if (isTmdbConfigured() && q.trim()) {
        if (isLive(kind)) liveHits = await searchTmdb(kind, q);
        else if (!kind) liveHits = await searchTmdbMulti(q);
      } else if (isLive(kind) && isTmdbConfigured()) {
        liveHits = await browseTmdb(kind);
      } else if (isLive(kind)) {
        liveHits = getByKind(kind);
      }
      // Prefer live for tv/movies; keep seed for other kinds.
      const seedOther = seedHits.filter((h) => !LIVE.includes(h.kind));
      const merged =
        kind && isLive(kind)
          ? liveHits
          : [...liveHits, ...seedOther];
      return NextResponse.json({ items: merged });
    }

    if (action === "upcoming") {
      const seed = upcomingItems().filter((i) => !LIVE.includes(i.kind));
      const live = isTmdbConfigured() ? await upcomingTmdbTv() : getByKind("tv");
      return NextResponse.json({
        items: [...live, ...seed].slice(0, 12),
      });
    }

    // browse
    if (!isLive(kind)) {
      return NextResponse.json({
        items: getByKind(kind as CategoryKind),
        source: "seed",
      });
    }
    if (!isTmdbConfigured()) {
      return NextResponse.json({
        items: getByKind(kind),
        source: "seed",
      });
    }
    const qTrim = q.trim();
    const items = qTrim
      ? await searchTmdb(kind, qTrim)
      : await browseTmdb(kind);
    return NextResponse.json({ items, source: "tmdb" });
  } catch (err) {
    console.error(err);
    if (isLive(kind)) {
      return NextResponse.json({
        items: getByKind(kind),
        source: "seed-fallback",
        error: err instanceof Error ? err.message : "TMDb error",
      });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Catalog error" },
      { status: 500 },
    );
  }
}
