import { describe, expect, it } from "vitest";
import {
  coverUrl,
  openLibraryItemId,
  parseOpenLibraryItemId,
} from "@/lib/providers/open-library";

describe("open library ids", () => {
  it("builds and parses stable work ids", () => {
    expect(openLibraryItemId("OL17930368W")).toBe("ol-book-OL17930368W");
    expect(openLibraryItemId("/works/OL17930368W")).toBe(
      "ol-book-OL17930368W",
    );
    expect(parseOpenLibraryItemId("ol-book-OL17930368W")).toBe("OL17930368W");
    expect(parseOpenLibraryItemId("bk-1")).toBeNull();
    expect(parseOpenLibraryItemId("tmdb-tv-1")).toBeNull();
  });

  it("builds cover urls from id or edition key", () => {
    expect(coverUrl(12539702)).toBe(
      "https://covers.openlibrary.org/b/id/12539702-L.jpg",
    );
    expect(coverUrl(undefined, "OL36647151M")).toBe(
      "https://covers.openlibrary.org/b/olid/OL36647151M-L.jpg",
    );
    expect(coverUrl()).toBeUndefined();
  });
});
