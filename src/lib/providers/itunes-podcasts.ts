import type { CatalogItem } from "@/lib/types";

const SEARCH_BASE = "https://itunes.apple.com/search";
const LOOKUP_BASE = "https://itunes.apple.com/lookup";
const TOP_RSS = "https://itunes.apple.com/us/rss/toppodcasts/limit=25/json";
const UA = "CurrentlyOn/1.0 (https://github.com/sologerst/currently-on)";

export function isItunesPodcastsConfigured() {
  // Public Search + RSS APIs — no key required.
  return true;
}

export function itunesPodcastId(collectionId: number | string) {
  return `itunes-pod-${collectionId}`;
}

export function parseItunesPodcastId(id: string): string | null {
  const m = /^itunes-pod-(\d+)$/.exec(id);
  return m ? m[1] : null;
}

/** Prefer 600px artwork; fall back through smaller sizes. */
export function artworkUrl(
  artworkUrl600?: string,
  artworkUrl100?: string,
  fallback?: string,
) {
  if (artworkUrl600) return artworkUrl600;
  if (artworkUrl100) {
    return artworkUrl100.replace(/\/\d+x\d+bb\./, "/600x600bb.");
  }
  if (fallback) {
    return fallback.replace(/\/\d+x\d+bb\./, "/600x600bb.");
  }
  return undefined;
}

type ItunesPodcastResult = {
  collectionId?: number;
  trackId?: number;
  collectionName?: string;
  trackName?: string;
  artistName?: string;
  primaryGenreName?: string;
  genres?: string[];
  artworkUrl600?: string;
  artworkUrl100?: string;
  releaseDate?: string;
  trackCount?: number;
  kind?: string;
  wrapperType?: string;
};

type RssEntry = {
  "im:name"?: { label?: string };
  "im:artist"?: { label?: string };
  "im:image"?: { label?: string; attributes?: { height?: string } }[];
  category?: { attributes?: { label?: string } };
  id?: { attributes?: { "im:id"?: string } };
  "im:releaseDate"?: { label?: string };
};

async function itunesFetch<T>(url: string) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": UA },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`iTunes ${res.status} for ${url}`);
  return (await res.json()) as T;
}

function mapResult(row: ItunesPodcastResult): CatalogItem | null {
  const collectionId = row.collectionId ?? row.trackId;
  const name = row.collectionName || row.trackName;
  if (!collectionId || !name) return null;
  if (row.kind && row.kind !== "podcast") return null;

  const genres = (row.genres ?? []).filter(
    (g) => g && g.toLowerCase() !== "podcasts",
  );
  const year = row.releaseDate?.match(/\d{4}/)?.[0];

  return {
    id: itunesPodcastId(collectionId),
    kind: "podcasts",
    name,
    author: row.artistName,
    genre: row.primaryGenreName || genres[0],
    genres: genres.slice(0, 4),
    releaseDate: year,
    imageUrl: artworkUrl(row.artworkUrl600, row.artworkUrl100),
    nextLabel:
      typeof row.trackCount === "number" && row.trackCount > 0
        ? `${row.trackCount} eps`
        : undefined,
  };
}

function mapRssEntry(entry: RssEntry): CatalogItem | null {
  const collectionId = entry.id?.attributes?.["im:id"];
  const name = entry["im:name"]?.label;
  if (!collectionId || !name) return null;

  const images = entry["im:image"] ?? [];
  const largest = [...images].sort(
    (a, b) =>
      Number(b.attributes?.height ?? 0) - Number(a.attributes?.height ?? 0),
  )[0]?.label;
  const year = entry["im:releaseDate"]?.label?.match(/\d{4}/)?.[0];
  const genre = entry.category?.attributes?.label;

  return {
    id: itunesPodcastId(collectionId),
    kind: "podcasts",
    name,
    author: entry["im:artist"]?.label,
    genre,
    genres: genre ? [genre] : undefined,
    releaseDate: year,
    imageUrl: artworkUrl(undefined, undefined, largest),
  };
}

export async function browseItunesPodcasts(): Promise<CatalogItem[]> {
  const data = await itunesFetch<{ feed?: { entry?: RssEntry | RssEntry[] } }>(
    TOP_RSS,
  );
  const raw = data.feed?.entry;
  const entries = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const out: CatalogItem[] = [];
  for (const entry of entries) {
    const item = mapRssEntry(entry);
    if (item) out.push(item);
  }
  return out.slice(0, 20);
}

export async function searchItunesPodcasts(
  query: string,
): Promise<CatalogItem[]> {
  const q = query.trim();
  if (!q) return browseItunesPodcasts();

  const url = new URL(SEARCH_BASE);
  url.searchParams.set("term", q);
  url.searchParams.set("media", "podcast");
  url.searchParams.set("entity", "podcast");
  url.searchParams.set("limit", "20");

  const data = await itunesFetch<{ results?: ItunesPodcastResult[] }>(
    url.toString(),
  );
  const out: CatalogItem[] = [];
  for (const row of data.results ?? []) {
    const item = mapResult(row);
    if (item) out.push(item);
  }
  return out;
}

export async function getItunesPodcastItem(
  id: string,
): Promise<CatalogItem | null> {
  const collectionId = parseItunesPodcastId(id);
  if (!collectionId) return null;

  const url = new URL(LOOKUP_BASE);
  url.searchParams.set("id", collectionId);
  url.searchParams.set("entity", "podcast");

  const data = await itunesFetch<{ results?: ItunesPodcastResult[] }>(
    url.toString(),
  );
  for (const row of data.results ?? []) {
    const item = mapResult(row);
    if (item) return item;
  }
  return null;
}
