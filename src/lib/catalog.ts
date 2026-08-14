import type { CatalogItem, CategoryKind } from "./types";

/** Swap this module for TMDb / Google Books / etc. later. */
const CATALOG: CatalogItem[] = [
  {
    id: "tv-1",
    kind: "tv",
    name: "Harbor Lights",
    genres: ["Drama", "Mystery"],
    rating: 8.4,
    platform: "Streamline",
    seasonCount: 3,
    runningStatus: "running",
    nextDate: "2026-08-21",
    nextLabel: "S3E6",
  },
  {
    id: "tv-2",
    kind: "tv",
    name: "Night Shift Kitchen",
    genres: ["Comedy"],
    rating: 7.9,
    platform: "Peak",
    seasonCount: 2,
    runningStatus: "running",
    nextDate: "2026-08-18",
    nextLabel: "S2E4",
  },
  {
    id: "tv-3",
    kind: "tv",
    name: "The Last Atlas",
    genres: ["Sci-Fi"],
    rating: 8.8,
    platform: "Orbit",
    seasonCount: 1,
    runningStatus: "ended",
  },
  {
    id: "tv-4",
    kind: "tv",
    name: "County Line",
    genres: ["Crime"],
    rating: 8.1,
    platform: "Streamline",
    seasonCount: 5,
    runningStatus: "running",
    nextDate: "2026-09-02",
    nextLabel: "S5E1",
  },
  {
    id: "tv-5",
    kind: "tv",
    name: "Paper Planes",
    genres: ["Animation"],
    rating: 7.6,
    platform: "Kids+",
    seasonCount: 4,
    runningStatus: "running",
    nextDate: "2026-08-16",
    nextLabel: "S4E12",
  },
  {
    id: "mu-1",
    kind: "music",
    name: "Juniper Vale",
    genre: "Indie pop",
    rating: 8.2,
    nextDate: "2026-08-29",
    nextLabel: "Album: Glass Harbor",
  },
  {
    id: "mu-2",
    kind: "music",
    name: "Low Voltage",
    genre: "Electronic",
    rating: 7.5,
    nextDate: "2026-09-12",
    nextLabel: "Single: Night Bus",
  },
  {
    id: "mu-3",
    kind: "music",
    name: "Mara Quinn",
    genre: "Folk",
    rating: 8.7,
  },
  {
    id: "mu-4",
    kind: "music",
    name: "Redline Brass",
    genre: "Jazz",
    rating: 8.0,
    nextDate: "2026-10-03",
    nextLabel: "Live EP",
  },
  {
    id: "mo-1",
    kind: "movies",
    name: "Winter Circuit",
    genre: "Thriller",
    rating: 7.4,
    releaseDate: "2026-09-04",
    notYetStreaming: true,
  },
  {
    id: "mo-2",
    kind: "movies",
    name: "The Quiet Market",
    genre: "Drama",
    rating: 8.1,
    platform: "Peak",
  },
  {
    id: "mo-3",
    kind: "movies",
    name: "Aster Field",
    genre: "Sci-Fi",
    rating: 7.8,
    releaseDate: "2026-08-22",
    notYetStreaming: true,
  },
  {
    id: "mo-4",
    kind: "movies",
    name: "Second Breakfast",
    genre: "Comedy",
    rating: 6.9,
    platform: "Streamline",
  },
  {
    id: "po-1",
    kind: "podcasts",
    name: "After the Credits",
    genre: "Film",
    rating: 8.6,
    nextDate: "2026-08-19",
    nextLabel: "Ep. 214",
  },
  {
    id: "po-2",
    kind: "podcasts",
    name: "Long Form Science",
    genre: "Science",
    rating: 8.9,
    nextDate: "2026-08-25",
    nextLabel: "Ep. 91",
  },
  {
    id: "po-3",
    kind: "podcasts",
    name: "Kitchen Table",
    genre: "Culture",
    rating: 7.7,
  },
  {
    id: "po-4",
    kind: "podcasts",
    name: "Mile Marker",
    genre: "Sports",
    rating: 8.0,
    nextDate: "2026-08-17",
    nextLabel: "Ep. 40",
  },
  {
    id: "bk-1",
    kind: "books",
    name: "Saltwater Archive",
    author: "Elena Cho",
    genre: "Literary",
    rating: 4.3,
  },
  {
    id: "bk-2",
    kind: "books",
    name: "The Cartographer's Daughter",
    author: "N. R. Hale",
    genre: "Fantasy",
    rating: 4.6,
  },
  {
    id: "bk-3",
    kind: "books",
    name: "Signal Loss",
    author: "Priya Menon",
    genre: "Thriller",
    rating: 4.1,
  },
  {
    id: "bk-4",
    kind: "books",
    name: "How We Measure Time",
    author: "Owen Blake",
    genre: "Nonfiction",
    rating: 4.4,
  },
];

const SEED_TRACK_IDS = ["tv-1", "tv-2", "mu-1", "mo-1", "po-1", "bk-1", "bk-2"];

export function getCatalog(): CatalogItem[] {
  return CATALOG;
}

export function getByKind(kind: CategoryKind): CatalogItem[] {
  return CATALOG.filter((i) => i.kind === kind);
}

export function getItem(kind: CategoryKind, id: string): CatalogItem | undefined {
  return CATALOG.find((i) => i.kind === kind && i.id === id);
}

export function searchCatalog(q: string): CatalogItem[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return CATALOG.filter(
    (i) =>
      i.name.toLowerCase().includes(s) ||
      i.author?.toLowerCase().includes(s) ||
      i.genre?.toLowerCase().includes(s) ||
      i.genres?.some((g) => g.toLowerCase().includes(s)),
  );
}

export function seedTrackedIds(): string[] {
  return SEED_TRACK_IDS;
}

export function upcomingItems(): CatalogItem[] {
  return CATALOG.filter((i) => i.nextDate || i.releaseDate).sort((a, b) =>
    upcomingIso(a).localeCompare(upcomingIso(b)),
  );
}

export function upcomingIso(item: CatalogItem): string {
  return item.nextDate || item.releaseDate || "9999-12-31";
}
