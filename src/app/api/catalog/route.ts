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
  browseOpenLibrary,
  getOpenLibraryItem,
  isOpenLibraryConfigured,
  searchOpenLibrary,
} from "@/lib/providers/open-library";
import {
  getByKind,
  getItem,
  searchCatalog,
  upcomingItems,
} from "@/lib/catalog";
import type { CatalogItem, CategoryKind } from "@/lib/types";

const LIVE_KINDS: CategoryKind[] = ["tv", "movies", "books"];

function isTmdbKind(kind: string): kind is "tv" | "movies" {
  return kind === "tv" || kind === "movies";
}

function isBooks(kind: string): kind is "books" {
  return kind === "books";
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
        return NextResponse.json(
          { error: "kind and id required" },
          { status: 400 },
        );
      }
      if (isTmdbKind(kind) && isTmdbConfigured()) {
        const live = await getTmdbItem(kind, id);
        if (live) return NextResponse.json({ item: live });
      }
      if (isBooks(kind) && isOpenLibraryConfigured()) {
        const live = await getOpenLibraryItem(id);
        if (live) return NextResponse.json({ item: live });
      }
      const seed = getItem(kind as CategoryKind, id);
      return NextResponse.json({ item: seed ?? null });
    }

    if (action === "search") {
      const seedHits = searchCatalog(q);
      const liveHits: CatalogItem[] = [];

      if (q.trim()) {
        if (isTmdbKind(kind) && isTmdbConfigured()) {
          liveHits.push(...(await searchTmdb(kind, q)));
        } else if (isBooks(kind) && isOpenLibraryConfigured()) {
          liveHits.push(...(await searchOpenLibrary(q)));
        } else if (!kind) {
          if (isTmdbConfigured()) {
            liveHits.push(...(await searchTmdbMulti(q)));
          }
          if (isOpenLibraryConfigured()) {
            liveHits.push(...(await searchOpenLibrary(q)));
          }
        }
      } else if (isTmdbKind(kind) && isTmdbConfigured()) {
        liveHits.push(...(await browseTmdb(kind)));
      } else if (isBooks(kind) && isOpenLibraryConfigured()) {
        liveHits.push(...(await browseOpenLibrary()));
      } else if (isTmdbKind(kind) || isBooks(kind)) {
        liveHits.push(...getByKind(kind));
      }

      const seedOther = seedHits.filter((h) => !LIVE_KINDS.includes(h.kind));
      const merged =
        kind && (isTmdbKind(kind) || isBooks(kind))
          ? liveHits
          : [...liveHits, ...seedOther];
      return NextResponse.json({ items: merged });
    }

    if (action === "upcoming") {
      const seed = upcomingItems().filter((i) => !LIVE_KINDS.includes(i.kind));
      const liveTv = isTmdbConfigured()
        ? await upcomingTmdbTv()
        : getByKind("tv");
      return NextResponse.json({
        items: [...liveTv, ...seed].slice(0, 12),
      });
    }

    // browse
    if (isBooks(kind)) {
      if (!isOpenLibraryConfigured()) {
        return NextResponse.json({
          items: getByKind("books"),
          source: "seed",
        });
      }
      const qTrim = q.trim();
      const items = qTrim
        ? await searchOpenLibrary(qTrim)
        : await browseOpenLibrary();
      return NextResponse.json({ items, source: "open-library" });
    }

    if (!isTmdbKind(kind)) {
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
    if (isTmdbKind(kind) || isBooks(kind)) {
      return NextResponse.json({
        items: getByKind(kind as CategoryKind),
        source: "seed-fallback",
        error: err instanceof Error ? err.message : "Catalog error",
      });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Catalog error" },
      { status: 500 },
    );
  }
}
