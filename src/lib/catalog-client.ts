import type { CatalogItem, CategoryKind } from "@/lib/types";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Catalog request failed (${res.status})`);
  return (await res.json()) as T;
}

export async function fetchCatalogBrowse(
  kind: CategoryKind,
  q = "",
): Promise<CatalogItem[]> {
  const params = new URLSearchParams({
    action: "browse",
    kind,
  });
  if (q.trim()) params.set("q", q.trim());
  const data = await getJson<{ items: CatalogItem[] }>(
    `/api/catalog?${params}`,
  );
  return data.items ?? [];
}

export async function fetchCatalogSearch(
  q: string,
  kind?: CategoryKind,
): Promise<CatalogItem[]> {
  const params = new URLSearchParams({ action: "search", q });
  if (kind) params.set("kind", kind);
  const data = await getJson<{ items: CatalogItem[] }>(
    `/api/catalog?${params}`,
  );
  return data.items ?? [];
}

export async function fetchCatalogItem(
  kind: CategoryKind,
  id: string,
): Promise<CatalogItem | null> {
  const params = new URLSearchParams({ action: "item", kind, id });
  const data = await getJson<{ item: CatalogItem | null }>(
    `/api/catalog?${params}`,
  );
  return data.item ?? null;
}

export async function fetchUpcomingCatalog(): Promise<CatalogItem[]> {
  const data = await getJson<{ items: CatalogItem[] }>(
    "/api/catalog?action=upcoming",
  );
  return data.items ?? [];
}
