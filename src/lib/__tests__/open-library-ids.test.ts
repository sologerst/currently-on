import { describe, expect, it } from "vitest";
import {
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
});
