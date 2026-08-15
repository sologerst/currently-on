import type { CatalogItem, CategoryKind } from "@/lib/types";

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/w342";

export function isTmdbConfigured() {
  return Boolean(
    process.env.TMDB_READ_ACCESS_TOKEN || process.env.TMDB_API_KEY,
  );
}

function authHeaders(): HeadersInit {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  if (token) {
    return {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };
  }
  return { Accept: "application/json" };
}

function withKey(url: URL) {
  const key = process.env.TMDB_API_KEY;
  if (!process.env.TMDB_READ_ACCESS_TOKEN && key) {
    url.searchParams.set("api_key", key);
  }
  return url;
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}) {
  if (!isTmdbConfigured()) {
    throw new Error("TMDb is not configured");
  }
  const url = withKey(new URL(`${TMDB_BASE}${path}`));
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: authHeaders(),
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    throw new Error(`TMDb ${res.status} for ${path}`);
  }
  return (await res.json()) as T;
}

export function tmdbItemId(kind: "tv" | "movies", tmdbId: number | string) {
  return kind === "tv" ? `tmdb-tv-${tmdbId}` : `tmdb-movie-${tmdbId}`;
}

export function parseTmdbItemId(
  kind: CategoryKind,
  id: string,
): number | null {
  if (kind === "tv") {
    const m = /^tmdb-tv-(\d+)$/.exec(id);
    return m ? Number(m[1]) : null;
  }
  if (kind === "movies") {
    const m = /^tmdb-movie-(\d+)$/.exec(id);
    return m ? Number(m[1]) : null;
  }
  return null;
}

type TmdbListResult = {
  id: number;
  name?: string;
  title?: string;
  overview?: string;
  poster_path?: string | null;
  genre_ids?: number[];
  vote_average?: number;
  first_air_date?: string;
  release_date?: string;
  media_type?: string;
};

type TmdbTvDetail = TmdbListResult & {
  genres?: { id: number; name: string }[];
  number_of_seasons?: number;
  status?: string;
  networks?: { name: string }[];
  next_episode_to_air?: {
    air_date?: string;
    episode_number?: number;
    season_number?: number;
    name?: string;
  } | null;
};

type TmdbMovieDetail = TmdbListResult & {
  genres?: { id: number; name: string }[];
  runtime?: number;
  status?: string;
};

function mapTv(row: TmdbListResult | TmdbTvDetail): CatalogItem {
  const detail = row as TmdbTvDetail;
  const next = detail.next_episode_to_air;
  const status = detail.status?.toLowerCase();
  return {
    id: tmdbItemId("tv", row.id),
    kind: "tv",
    name: row.name || "Untitled",
    genres: detail.genres?.map((g) => g.name),
    rating: row.vote_average ? Number(row.vote_average.toFixed(1)) : undefined,
    platform: detail.networks?.[0]?.name,
    seasonCount: detail.number_of_seasons,
    runningStatus:
      status === "ended" || status === "canceled"
        ? "ended"
        : status
          ? "running"
          : undefined,
    nextDate: next?.air_date,
    nextLabel:
      next?.season_number != null && next?.episode_number != null
        ? `S${next.season_number}E${next.episode_number}`
        : undefined,
    imageUrl: row.poster_path ? `${IMG_BASE}${row.poster_path}` : undefined,
  };
}

function mapMovie(row: TmdbListResult | TmdbMovieDetail): CatalogItem {
  const detail = row as TmdbMovieDetail;
  return {
    id: tmdbItemId("movies", row.id),
    kind: "movies",
    name: row.title || "Untitled",
    genres: detail.genres?.map((g) => g.name),
    rating: row.vote_average ? Number(row.vote_average.toFixed(1)) : undefined,
    releaseDate: row.release_date || undefined,
    notYetStreaming: row.release_date
      ? row.release_date > new Date().toISOString().slice(0, 10)
      : undefined,
    imageUrl: row.poster_path ? `${IMG_BASE}${row.poster_path}` : undefined,
  };
}

export async function browseTmdb(
  kind: "tv" | "movies",
): Promise<CatalogItem[]> {
  if (kind === "tv") {
    const data = await tmdbFetch<{ results: TmdbListResult[] }>(
      "/trending/tv/week",
    );
    return (data.results ?? []).slice(0, 20).map(mapTv);
  }
  const data = await tmdbFetch<{ results: TmdbListResult[] }>(
    "/trending/movie/week",
  );
  return (data.results ?? []).slice(0, 20).map(mapMovie);
}

export async function searchTmdb(
  kind: "tv" | "movies",
  query: string,
): Promise<CatalogItem[]> {
  const q = query.trim();
  if (!q) return browseTmdb(kind);
  if (kind === "tv") {
    const data = await tmdbFetch<{ results: TmdbListResult[] }>("/search/tv", {
      query: q,
      include_adult: "false",
    });
    return (data.results ?? []).slice(0, 20).map(mapTv);
  }
  const data = await tmdbFetch<{ results: TmdbListResult[] }>("/search/movie", {
    query: q,
    include_adult: "false",
  });
  return (data.results ?? []).slice(0, 20).map(mapMovie);
}

export async function searchTmdbMulti(query: string): Promise<CatalogItem[]> {
  const q = query.trim();
  if (!q) return [];
  const data = await tmdbFetch<{ results: TmdbListResult[] }>("/search/multi", {
    query: q,
    include_adult: "false",
  });
  const out: CatalogItem[] = [];
  for (const row of data.results ?? []) {
    if (row.media_type === "tv") out.push(mapTv(row));
    else if (row.media_type === "movie") out.push(mapMovie(row));
  }
  return out.slice(0, 30);
}

export async function getTmdbItem(
  kind: "tv" | "movies",
  id: string,
): Promise<CatalogItem | null> {
  const tmdbId = parseTmdbItemId(kind, id);
  if (tmdbId == null) return null;
  if (kind === "tv") {
    const detail = await tmdbFetch<TmdbTvDetail>(`/tv/${tmdbId}`);
    return mapTv(detail);
  }
  const detail = await tmdbFetch<TmdbMovieDetail>(`/movie/${tmdbId}`);
  return mapMovie(detail);
}

export async function upcomingTmdbTv(): Promise<CatalogItem[]> {
  const data = await tmdbFetch<{ results: TmdbListResult[] }>("/tv/on_the_air");
  // Detail calls for next episode would be N+1; use list dates lightly.
  return (data.results ?? []).slice(0, 8).map(mapTv);
}
