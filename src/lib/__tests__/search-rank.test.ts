import { describe, expect, it } from "vitest";
import { rankCatalogItems } from "@/lib/search-rank";
import type { CatalogItem } from "@/lib/types";

function item(
  partial: Pick<CatalogItem, "id" | "name"> & Partial<CatalogItem>,
): CatalogItem {
  return {
    kind: "books",
    ...partial,
  };
}

describe("rankCatalogItems", () => {
  it("prefers exact and prefix name matches", () => {
    const ranked = rankCatalogItems(
      [
        item({ id: "1", name: "Serial Killers Weekly" }),
        item({ id: "2", name: "Serial" }),
        item({ id: "3", name: "The Serial Archive" }),
      ],
      "serial",
    );
    // exact > starts-with > contains
    expect(ranked.map((r) => r.id)).toEqual(["2", "1", "3"]);
  });

  it("boosts author matches and artwork when names tie loosely", () => {
    const ranked = rankCatalogItems(
      [
        item({ id: "a", name: "Night Bus Notes", author: "Other" }),
        item({
          id: "b",
          name: "Night Bus",
          author: "Mara Quinn",
          imageUrl: "https://example.com/x.jpg",
        }),
      ],
      "night bus",
    );
    expect(ranked[0].id).toBe("b");
  });

  it("returns the same list when query is empty", () => {
    const items = [item({ id: "1", name: "A" }), item({ id: "2", name: "B" })];
    expect(rankCatalogItems(items, "  ")).toBe(items);
  });
});
