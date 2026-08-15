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
  browseMusicBrainz,
  getMusicBrainzItem,
  isMusicBrainzConfigured,
  searchMusicBrainz,
} from "@/lib/providers/musicbrainz";
import {
  browseItunesPodcasts,
  getItunesPodcastItem,
  isItunesPodcastsConfigured,
  searchItunesPodcasts,
} from "@/lib/providers/itunes-podcasts";
import {
  getByKind,
  getItem,
  searchCatalog,
  upcomingItems,
} from "@/lib/catalog";
import { rankCatalogItems } from "@/lib/search-rank";
import type { CatalogItem, CategoryKind } from "@/lib/types";

const LIVE_KINDS: CategoryKind[] = [
  "tv",
  "movies",
  "books",
  "music",
  "podcasts",
];

function isTmdbKind(kind: string): kind is "tv" | "movies" {
  return kind === "tv" || kind === "movies";
}

function isBooks(kind: string): kind is "books" {
  return kind === "books";
}

function isMusic(kind: string): kind is "music" {
  return kind === "music";
}

function isPodcasts(kind: string): kind is "podcasts" {
  return kind === "podcasts";
}

function isLiveKind(
  kind: string,
): kind is "tv" | "movies" | "books" | "music" | "podcasts" {
  return (
    isTmdbKind(kind) || isBooks(kind) || isMusic(kind) || isPodcasts(kind)
  );
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
      if (isMusic(kind) && isMusicBrainzConfigured()) {
        const live = await getMusicBrainzItem(id);
        if (live) return NextResponse.json({ item: live });
      }
      if (isPodcasts(kind) && isItunesPodcastsConfigured()) {
        const live = await getItunesPodcastItem(id);
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
        } else if (isMusic(kind) && isMusicBrainzConfigured()) {
          liveHits.push(...(await searchMusicBrainz(q)));
        } else if (isPodcasts(kind) && isItunesPodcastsConfigured()) {
          liveHits.push(...(await searchItunesPodcasts(q)));
        } else if (!kind) {
          if (isTmdbConfigured()) {
            liveHits.push(...(await searchTmdbMulti(q)));
          }
          if (isOpenLibraryConfigured()) {
            liveHits.push(...(await searchOpenLibrary(q)));
          }
          if (isMusicBrainzConfigured()) {
            liveHits.push(...(await searchMusicBrainz(q)));
          }
          if (isItunesPodcastsConfigured()) {
            liveHits.push(...(await searchItunesPodcasts(q)));
          }
        }
      } else if (isTmdbKind(kind) && isTmdbConfigured()) {
        liveHits.push(...(await browseTmdb(kind)));
      } else if (isBooks(kind) && isOpenLibraryConfigured()) {
        liveHits.push(...(await browseOpenLibrary()));
      } else if (isMusic(kind) && isMusicBrainzConfigured()) {
        liveHits.push(...(await browseMusicBrainz()));
      } else if (isPodcasts(kind) && isItunesPodcastsConfigured()) {
        liveHits.push(...(await browseItunesPodcasts()));
      } else if (isLiveKind(kind)) {
        liveHits.push(...getByKind(kind));
      }

      const seedOther = seedHits.filter((h) => !LIVE_KINDS.includes(h.kind));
      const merged = kind && isLiveKind(kind) ? liveHits : [...liveHits, ...seedOther];
      return NextResponse.json({
        items: q.trim() ? rankCatalogItems(merged, q) : merged,
      });
    }

    if (action === "upcoming") {
      // Live TV when TMDb is configured; always fill remaining slots from seed
      // so On Deck stays useful without every provider having release dates.
      let liveTv: CatalogItem[] = [];
      try {
        liveTv = isTmdbConfigured() ? await upcomingTmdbTv() : [];
      } catch (err) {
        console.error(err);
        liveTv = [];
      }
      const seen = new Set(liveTv.map((i) => `${i.kind}:${i.id}`));
      const seedFiller = upcomingItems().filter(
        (i) => !seen.has(`${i.kind}:${i.id}`),
      );
      return NextResponse.json({
        items: [...liveTv, ...seedFiller].slice(0, 12),
        source: liveTv.length ? "mixed" : "seed",
      });
    }

    // browse
    if (isBooks(kind)) {
      const qTrim = q.trim();
      const items = qTrim
        ? rankCatalogItems(await searchOpenLibrary(qTrim), qTrim)
        : await browseOpenLibrary();
      return NextResponse.json({ items, source: "open-library" });
    }

    if (isMusic(kind)) {
      const qTrim = q.trim();
      const items = qTrim
        ? rankCatalogItems(await searchMusicBrainz(qTrim), qTrim)
        : await browseMusicBrainz();
      return NextResponse.json({ items, source: "musicbrainz" });
    }

    if (isPodcasts(kind)) {
      const qTrim = q.trim();
      const items = qTrim
        ? rankCatalogItems(await searchItunesPodcasts(qTrim), qTrim)
        : await browseItunesPodcasts();
      return NextResponse.json({ items, source: "itunes" });
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
    const raw = qTrim ? await searchTmdb(kind, qTrim) : await browseTmdb(kind);
    const items = qTrim ? rankCatalogItems(raw, qTrim) : raw;
    return NextResponse.json({ items, source: "tmdb" });
  } catch (err) {
    console.error(err);
    if (isLiveKind(kind)) {
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
