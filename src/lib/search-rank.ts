import type { CatalogItem } from "@/lib/types";

/** Rank catalog hits for a free-text query (exact > prefix > contains; art boost). */
export function rankCatalogItems(
  items: CatalogItem[],
  query: string,
): CatalogItem[] {
  const q = query.trim().toLowerCase();
  if (!q || items.length < 2) return items;

  const score = (item: CatalogItem) => {
    const name = item.name.toLowerCase();
    const author = (item.author ?? "").toLowerCase();
    let s = 0;
    if (name === q) s += 100;
    else if (name.startsWith(q)) s += 80;
    else if (name.includes(q)) s += 50;
    if (author === q) s += 40;
    else if (author.startsWith(q)) s += 25;
    else if (author.includes(q)) s += 15;
    if (item.imageUrl) s += 5;
    s -= Math.min(name.length, 40) * 0.01;
    return s;
  };

  return [...items].sort((a, b) => {
    const diff = score(b) - score(a);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });
}
