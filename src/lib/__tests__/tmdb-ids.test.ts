import { describe, expect, it } from "vitest";
import { parseTmdbItemId, tmdbItemId } from "@/lib/providers/tmdb";

describe("tmdb ids", () => {
  it("builds and parses stable ids", () => {
    expect(tmdbItemId("tv", 94997)).toBe("tmdb-tv-94997");
    expect(tmdbItemId("movies", 550)).toBe("tmdb-movie-550");
    expect(parseTmdbItemId("tv", "tmdb-tv-94997")).toBe(94997);
    expect(parseTmdbItemId("movies", "tmdb-movie-550")).toBe(550);
    expect(parseTmdbItemId("tv", "tv-1")).toBeNull();
    expect(parseTmdbItemId("books", "tmdb-tv-1")).toBeNull();
  });
});
