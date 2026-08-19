import type { CategoryKind, ScreenKind } from "./types";

export const CATEGORY_META: Record<
  ScreenKind,
  {
    label: string;
    tab: string;
    hex: string;
    onDark: boolean;
    href: string;
    icon: string;
  }
> = {
  music: {
    label: "Music",
    tab: "MUSIC",
    hex: "#3DD68C",
    onDark: true,
    href: "/music",
    icon: "♪",
  },
  tv: {
    label: "TV",
    tab: "SHOWS",
    hex: "#FF5A63",
    onDark: false,
    href: "/tv",
    icon: "▣",
  },
  movies: {
    label: "Movies",
    tab: "MOVIES",
    hex: "#6B9BFF",
    onDark: false,
    href: "/movies",
    icon: "▶",
  },
  podcasts: {
    label: "Podcasts",
    tab: "PODCASTS",
    hex: "#2DD4BF",
    onDark: false,
    href: "/podcasts",
    icon: "◉",
  },
  books: {
    label: "Books",
    tab: "BOOKS",
    hex: "#F0A12E",
    onDark: true,
    href: "/books",
    icon: "▤",
  },
  friends: {
    label: "Friends",
    tab: "FRIENDS",
    hex: "#FFCC00",
    onDark: true,
    href: "/friends",
    icon: "◎",
  },
};

export const HOME_TILES: ScreenKind[] = [
  "music",
  "tv",
  "movies",
  "podcasts",
  "books",
  "friends",
];

export const MEDIA_KINDS: CategoryKind[] = [
  "music",
  "tv",
  "movies",
  "podcasts",
  "books",
];

export function tabsFor(kind: CategoryKind): { id: string; label: string }[] {
  switch (kind) {
    case "tv":
      return [
        { id: "want", label: "Want to Watch" },
        { id: "watching", label: "Watching" },
        { id: "finished", label: "Finished" },
        { id: "recommended", label: "Recommended" },
      ];
    case "books":
      return [
        { id: "want", label: "Want to Read" },
        { id: "reading", label: "Reading" },
        { id: "finished", label: "Finished" },
        { id: "recommended", label: "Recommended" },
      ];
    case "movies":
      return [
        { id: "want", label: "Want to Watch" },
        { id: "watched", label: "Watched" },
        { id: "recommended", label: "Recommended" },
      ];
    default:
      return [
        { id: "following", label: "Following" },
        { id: "recommended", label: "Recommended" },
      ];
  }
}

export function defaultStatus(kind: CategoryKind): string {
  if (kind === "music" || kind === "podcasts") return "following";
  return "want";
}

export function cycleStatus(kind: CategoryKind, current?: string): string {
  const ids = tabsFor(kind)
    .map((t) => t.id)
    .filter((id) => id !== "recommended");
  if (!current || !ids.includes(current)) return ids[0];
  const i = ids.indexOf(current);
  return ids[(i + 1) % ids.length];
}

export function isFinishedStatus(kind: CategoryKind, status: string): boolean {
  if (kind === "movies") return status === "watched";
  if (kind === "tv" || kind === "books") return status === "finished";
  return false;
}

export function isCurrentlyOnStatus(kind: CategoryKind, status: string): boolean {
  if (kind === "tv") return status === "watching";
  if (kind === "books") return status === "reading";
  if (kind === "movies") return status === "want";
  return status === "following";
}

export function lookItUpUrl(name: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(name)}`;
}
