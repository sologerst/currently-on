import type { CatalogItem } from "@/lib/types";

const MB_BASE = "https://musicbrainz.org/ws/2";
const CAA_FRONT = "https://coverartarchive.org/release-group";
const UA = "CurrentlyOn/1.0 (https://github.com/sologerst/currently-on)";

export function isMusicBrainzConfigured() {
  // Public API — no key; identify with User-Agent and keep request volume low.
  return true;
}

export function musicBrainzArtistId(mbid: string) {
  return `mb-artist-${mbid}`;
}

export function musicBrainzAlbumId(mbid: string) {
  return `mb-album-${mbid}`;
}

export function parseMusicBrainzArtistId(id: string): string | null {
  const m =
    /^mb-artist-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(
      id,
    );
  return m ? m[1].toLowerCase() : null;
}

export function parseMusicBrainzAlbumId(id: string): string | null {
  const m =
    /^mb-album-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(
      id,
    );
  return m ? m[1].toLowerCase() : null;
}

export function coverArtUrl(releaseGroupId: string) {
  return `${CAA_FRONT}/${releaseGroupId}/front-250`;
}

type MbTag = { name?: string; count?: number };

type MbArtistCredit = { name?: string; artist?: { id?: string; name?: string } };

type MbArtist = {
  id: string;
  name?: string;
  type?: string | null;
  disambiguation?: string;
  tags?: MbTag[];
  genres?: MbTag[];
};

type MbReleaseGroup = {
  id: string;
  title?: string;
  "primary-type"?: string | null;
  "first-release-date"?: string;
  "artist-credit"?: MbArtistCredit[];
  tags?: MbTag[];
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

function pauseForRateLimit() {
  return new Promise((resolve) => setTimeout(resolve, 1100));
}

function topTag(tags?: MbTag[], genres?: MbTag[]): string | undefined {
  const pool = [...(genres ?? []), ...(tags ?? [])]
    .filter((t) => t.name)
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
  return pool[0]?.name;
}

function creditName(rg: MbReleaseGroup): string | undefined {
  const credit = rg["artist-credit"]?.[0];
  return credit?.name || credit?.artist?.name;
}

function mapAlbum(rg: MbReleaseGroup): CatalogItem | null {
  if (!rg.id || !rg.title) return null;
  const year = rg["first-release-date"]?.match(/\d{4}/)?.[0];
  return {
    id: musicBrainzAlbumId(rg.id),
    kind: "music",
    name: rg.title,
    author: creditName(rg),
    genre: topTag(rg.tags) || rg["primary-type"] || undefined,
    releaseDate: year,
    imageUrl: coverArtUrl(rg.id),
    nextLabel: rg["primary-type"] || "Album",
  };
}

function mapArtist(
  artist: MbArtist,
  coverReleaseGroupId?: string,
): CatalogItem | null {
  if (!artist.id || !artist.name) return null;
  return {
    id: musicBrainzArtistId(artist.id),
    kind: "music",
    name: artist.name,
    genre: topTag(artist.tags, artist.genres),
    author: artist.disambiguation || undefined,
    imageUrl: coverReleaseGroupId
      ? coverArtUrl(coverReleaseGroupId)
      : undefined,
  };
}

/** Curated album discovery — MB has no trending endpoint. */
const BROWSE_ALBUMS =
  "primarytype:album AND status:official AND (tag:indie OR tag:alternative OR tag:electronic OR tag:pop OR tag:hip hop OR tag:jazz)";

export async function browseMusicBrainz(): Promise<CatalogItem[]> {
  const data = await mbFetch<{ "release-groups"?: MbReleaseGroup[] }>(
    "/release-group",
    {
      query: BROWSE_ALBUMS,
      limit: "20",
    },
  );
  const out: CatalogItem[] = [];
  for (const rg of data["release-groups"] ?? []) {
    const item = mapAlbum(rg);
    if (item) out.push(item);
  }
  return out;
}

export async function searchMusicBrainz(query: string): Promise<CatalogItem[]> {
  const q = query.trim();
  if (!q) return browseMusicBrainz();

  // One request for albums (covers included via CAA URL). Artists follow without
  // per-row Cover Art lookups to respect MusicBrainz rate limits.
  const albums = await mbFetch<{ "release-groups"?: MbReleaseGroup[] }>(
    "/release-group",
    {
      query: q,
      limit: "12",
    },
  );
  const albumItems: CatalogItem[] = [];
  for (const rg of albums["release-groups"] ?? []) {
    const item = mapAlbum(rg);
    if (item) albumItems.push(item);
  }

  await pauseForRateLimit();

  // Second call after a short pause — Next cache helps on repeat.
  const artists = await mbFetch<{ artists?: MbArtist[] }>("/artist", {
    query: q,
    limit: "8",
  });
  const artistItems: CatalogItem[] = [];
  for (const artist of artists.artists ?? []) {
    const item = mapArtist(artist);
    if (item) artistItems.push(item);
  }

  return [...albumItems, ...artistItems].slice(0, 24);
}

async function primaryAlbumCoverId(
  artistMbid: string,
): Promise<string | undefined> {
  const data = await mbFetch<{ "release-groups"?: MbReleaseGroup[] }>(
    "/release-group",
    {
      artist: artistMbid,
      type: "album",
      limit: "1",
    },
  );
  return data["release-groups"]?.[0]?.id;
}

export async function getMusicBrainzItem(
  id: string,
): Promise<CatalogItem | null> {
  const albumId = parseMusicBrainzAlbumId(id);
  if (albumId) {
    const rg = await mbFetch<MbReleaseGroup>(`/release-group/${albumId}`, {
      inc: "artist-credits+tags",
    });
    return mapAlbum(rg);
  }

  const artistId = parseMusicBrainzArtistId(id);
  if (!artistId) return null;
  const artist = await mbFetch<MbArtist>(`/artist/${artistId}`, {
    inc: "tags+genres",
  });
  await pauseForRateLimit();
  const coverRg = await primaryAlbumCoverId(artistId);
  return mapArtist(artist, coverRg);
}

/** @deprecated use getMusicBrainzItem */
export async function getMusicBrainzArtist(id: string) {
  return getMusicBrainzItem(id);
}
