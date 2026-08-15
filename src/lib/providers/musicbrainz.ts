import type { CatalogItem } from "@/lib/types";

const MB_BASE = "https://musicbrainz.org/ws/2";
const UA = "CurrentlyOn/1.0 (https://github.com/sologerst/currently-on)";

export function isMusicBrainzConfigured() {
  // Public API — no key; identify with User-Agent and keep request volume low.
  return true;
}

export function musicBrainzArtistId(mbid: string) {
  return `mb-artist-${mbid}`;
}

export function parseMusicBrainzArtistId(id: string): string | null {
  const m =
    /^mb-artist-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(
      id,
    );
  return m ? m[1].toLowerCase() : null;
}

type MbTag = { name?: string; count?: number };

type MbArtist = {
  id: string;
  name?: string;
  type?: string | null;
  country?: string | null;
  disambiguation?: string;
  tags?: MbTag[];
  genres?: MbTag[];
  "life-span"?: { begin?: string | null; ended?: boolean | null };
};

async function mbFetch<T>(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${MB_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  if (!url.searchParams.has("fmt")) url.searchParams.set("fmt", "json");
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": UA,
    },
    // Cache aggressively — MusicBrainz asks for ≤1 req/sec.
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    throw new Error(`MusicBrainz ${res.status} for ${path}`);
  }
  return (await res.json()) as T;
}

function topTag(artist: MbArtist): string | undefined {
  const pool = [...(artist.genres ?? []), ...(artist.tags ?? [])]
    .filter((t) => t.name)
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
  return pool[0]?.name;
}

function mapArtist(artist: MbArtist): CatalogItem | null {
  if (!artist.id || !artist.name) return null;
  return {
    id: musicBrainzArtistId(artist.id),
    kind: "music",
    name: artist.name,
    genre: topTag(artist),
    author: artist.disambiguation || undefined,
  };
}

/** Curated discovery query — MB has no trending endpoint. */
const BROWSE_QUERY =
  "type:group AND (tag:indie OR tag:alternative OR tag:electronic OR tag:hip hop OR tag:jazz OR tag:pop)";

export async function browseMusicBrainz(): Promise<CatalogItem[]> {
  const data = await mbFetch<{ artists?: MbArtist[] }>("/artist", {
    query: BROWSE_QUERY,
    limit: "20",
  });
  const out: CatalogItem[] = [];
  for (const artist of data.artists ?? []) {
    const item = mapArtist(artist);
    if (item) out.push(item);
  }
  return out;
}

export async function searchMusicBrainz(query: string): Promise<CatalogItem[]> {
  const q = query.trim();
  if (!q) return browseMusicBrainz();
  const data = await mbFetch<{ artists?: MbArtist[] }>("/artist", {
    query: q,
    limit: "20",
  });
  const out: CatalogItem[] = [];
  for (const artist of data.artists ?? []) {
    const item = mapArtist(artist);
    if (item) out.push(item);
  }
  return out;
}

export async function getMusicBrainzArtist(
  id: string,
): Promise<CatalogItem | null> {
  const mbid = parseMusicBrainzArtistId(id);
  if (!mbid) return null;
  const artist = await mbFetch<MbArtist>(`/artist/${mbid}`, {
    inc: "tags+genres",
  });
  return mapArtist(artist);
}
