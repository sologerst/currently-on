import type { CatalogItem } from "@/lib/types";

const OL_BASE = "https://openlibrary.org";
const COVER_BASE = "https://covers.openlibrary.org/b/id";
const UA = "CurrentlyOn/1.0 (https://github.com/sologerst/currently-on)";

export function isOpenLibraryConfigured() {
  // Public API — always available server-side (no key required).
  return true;
}

export function openLibraryItemId(workKey: string) {
  const id = workKey.replace(/^\/works\//, "").replace(/^\//, "");
  return `ol-book-${id}`;
}

export function parseOpenLibraryItemId(id: string): string | null {
  const m = /^ol-book-(OL\d+W)$/i.exec(id);
  if (!m) return null;
  return m[1].replace(/^ol(\d+)w$/i, (_, digits: string) => `OL${digits}W`);
}

type OlDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
  subject?: string[];
  ratings_average?: number;
};

type OlWorkDetail = {
  key?: string;
  title?: string;
  description?: string | { value?: string };
  covers?: number[];
  subjects?: string[];
  authors?: { author?: { key?: string } }[];
  first_publish_date?: string;
};

async function olFetch<T>(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${OL_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": UA },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Open Library ${res.status} for ${path}`);
  return (await res.json()) as T;
}

function coverUrl(coverId?: number) {
  if (!coverId) return undefined;
  return `${COVER_BASE}/${coverId}-M.jpg`;
}

function mapDoc(doc: OlDoc): CatalogItem | null {
  const key = doc.key;
  if (!key || !doc.title) return null;
  const workId = key.includes("/works/")
    ? key.replace(/^\/works\//, "")
    : key.startsWith("OL")
      ? key
      : null;
  if (!workId) return null;
  return {
    id: openLibraryItemId(workId),
    kind: "books",
    name: doc.title,
    author: doc.author_name?.[0],
    genres: doc.subject?.slice(0, 4),
    rating: doc.ratings_average
      ? Number(doc.ratings_average.toFixed(1))
      : undefined,
    releaseDate: doc.first_publish_year
      ? String(doc.first_publish_year)
      : undefined,
    imageUrl: coverUrl(doc.cover_i),
  };
}

export async function browseOpenLibrary(): Promise<CatalogItem[]> {
  const data = await olFetch<{ works?: OlDoc[] }>("/trending/daily.json");
  const out: CatalogItem[] = [];
  for (const doc of data.works ?? []) {
    const item = mapDoc(doc);
    if (item) out.push(item);
    if (out.length >= 20) break;
  }
  return out;
}

export async function searchOpenLibrary(query: string): Promise<CatalogItem[]> {
  const q = query.trim();
  if (!q) return browseOpenLibrary();
  const data = await olFetch<{ docs?: OlDoc[] }>("/search.json", {
    q,
    limit: "20",
    fields:
      "key,title,author_name,cover_i,first_publish_year,subject,ratings_average",
  });
  const out: CatalogItem[] = [];
  for (const doc of data.docs ?? []) {
    const item = mapDoc(doc);
    if (item) out.push(item);
  }
  return out;
}

export async function getOpenLibraryItem(
  id: string,
): Promise<CatalogItem | null> {
  const workId = parseOpenLibraryItemId(id);
  if (!workId) return null;
  const detail = await olFetch<OlWorkDetail>(`/works/${workId}.json`);
  let author: string | undefined;
  const authorKey = detail.authors?.[0]?.author?.key;
  if (authorKey) {
    try {
      const a = await olFetch<{ name?: string }>(`${authorKey}.json`);
      author = a.name;
    } catch {
      // optional
    }
  }
  const cover = detail.covers?.[0];
  const year = detail.first_publish_date?.match(/\d{4}/)?.[0];
  return {
    id: openLibraryItemId(workId),
    kind: "books",
    name: detail.title || "Untitled",
    author,
    genres: detail.subjects?.slice(0, 6),
    releaseDate: year,
    imageUrl: coverUrl(cover),
  };
}
