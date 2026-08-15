import { describe, expect, it } from "vitest";
import {
  CATEGORY_META,
  defaultStatus,
  isFinishedStatus,
  MEDIA_KINDS,
} from "@/lib/categories";

describe("categories", () => {
  it("exposes five media kinds plus friends", () => {
    expect(MEDIA_KINDS).toHaveLength(5);
    expect(CATEGORY_META.friends.label).toBe("Friends");
    expect(CATEGORY_META.music.hex).toMatch(/^#/);
  });

  it("returns sensible default statuses", () => {
    expect(defaultStatus("tv")).toBe("want");
    expect(defaultStatus("books")).toBe("want");
    expect(defaultStatus("movies")).toBe("want");
    expect(defaultStatus("music")).toBe("following");
    expect(defaultStatus("podcasts")).toBe("following");
  });

  it("detects finished statuses", () => {
    expect(isFinishedStatus("tv", "finished")).toBe(true);
    expect(isFinishedStatus("tv", "watching")).toBe(false);
    expect(isFinishedStatus("movies", "watched")).toBe(true);
    expect(isFinishedStatus("books", "finished")).toBe(true);
  });
});
