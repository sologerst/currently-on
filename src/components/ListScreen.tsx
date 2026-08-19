"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { CoverCard } from "@/components/MediaBits";
import { fetchCatalogSearch } from "@/lib/catalog-client";
import {
  addListItem,
  loadListBySlug,
  loadProfileByHandle,
  removeListItem,
  updateListMeta,
} from "@/lib/community-remote";
import type { ListVisibility, MediaList, Person } from "@/lib/community-types";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useTracker } from "@/lib/tracker";
import type { CatalogItem } from "@/lib/types";

export function ListScreen({
  handle,
  slug,
}: {
  handle: string;
  slug: string;
}) {
  const { userId, refreshCommunity, addFromFriend, state } = useTracker();
  const [person, setPerson] = useState<Person | null>(null);
  const [list, setList] = useState<MediaList | null>(null);
  const [missing, setMissing] = useState(!isSupabaseConfigured());
  const [loaded, setLoaded] = useState(!isSupabaseConfigured());
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CatalogItem[]>([]);
  const [note, setNote] = useState("");
  const [visibility, setVisibility] = useState<ListVisibility>("public");

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    const supabase = createClient();
    void (async () => {
      try {
        const profile = await loadProfileByHandle(supabase, handle);
        if (cancelled) return;
        if (!profile) {
          setMissing(true);
          return;
        }
        const next = await loadListBySlug(supabase, profile.id, slug);
        if (cancelled) return;
        if (!next) {
          setMissing(true);
          return;
        }
        setPerson(profile);
        setList(next);
        setVisibility(next.visibility);
        setLoaded(true);
      } catch {
        if (!cancelled) setMissing(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [handle, slug]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      void fetchCatalogSearch(q).then((items) => {
        if (!cancelled) setHits(items.slice(0, 6));
      });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query]);

  const shownHits = query.trim().length < 2 ? [] : hits;

  const own = Boolean(person && userId && person.id === userId);

  async function reload(supabase = createClient()) {
    const profile = await loadProfileByHandle(supabase, handle);
    if (!profile) {
      setMissing(true);
      return;
    }
    const next = await loadListBySlug(supabase, profile.id, slug);
    if (!next) {
      setMissing(true);
      return;
    }
    setPerson(profile);
    setList(next);
    setVisibility(next.visibility);
  }

  async function onAdd(item: CatalogItem) {
    if (!list || !isSupabaseConfigured()) return;
    const supabase = createClient();
    await addListItem(supabase, list.id, {
      kind: item.kind,
      id: item.id,
      name: item.name,
      imageUrl: item.imageUrl,
      note: note.trim(),
    });
    setQuery("");
    setNote("");
    setHits([]);
    await reload(supabase);
    await refreshCommunity();
  }

  async function onRemove(kind: MediaList["items"][number]["itemKind"], id: string) {
    if (!list || !isSupabaseConfigured()) return;
    const supabase = createClient();
    await removeListItem(supabase, list.id, kind, id);
    await reload(supabase);
    await refreshCommunity();
  }

  async function onVisibility(e: FormEvent) {
    e.preventDefault();
    if (!list || !isSupabaseConfigured()) return;
    const supabase = createClient();
    await updateListMeta(supabase, list.id, { visibility });
    await reload(supabase);
    await refreshCommunity();
  }

  if (!loaded && !missing) {
    return <p className="px-4 py-8 text-sm text-muted">Loading…</p>;
  }

  if (missing || !list || !person) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <h1 className="font-display text-3xl">List not found</h1>
        <p className="mt-2 text-sm text-muted">
          This list is private or does not exist.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-8 pt-3">
      <p className="font-display text-[11px] uppercase tracking-[0.16em] text-white/45">
        <Link href={`/u/${person.handle}`}>@{person.handle}</Link>
      </p>
      <h1 className="mt-1 font-display text-[2.1rem] font-semibold italic leading-none">
        {list.title}
      </h1>
      {list.description && (
        <p className="mt-3 text-sm text-muted">{list.description}</p>
      )}

      {own && (
        <form onSubmit={(e) => void onVisibility(e)} className="mt-4 flex gap-2">
          <select
            className="field flex-1"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as ListVisibility)}
          >
            <option value="public">Public</option>
            <option value="friends">Friends</option>
            <option value="private">Private</option>
          </select>
          <button className="btn-ghost">Save</button>
        </form>
      )}

      {own && (
        <div className="panel mt-5 space-y-2 p-4">
          <p className="font-display text-sm">Add a title</p>
          <input
            className="field"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search any medium"
          />
          <input
            className="field"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional why-note"
          />
          <ul>
            {shownHits.map((item) => (
              <li key={`${item.kind}:${item.id}`}>
                <button
                  type="button"
                  className="pressable flex w-full items-center gap-3 py-2 text-left"
                  onClick={() => void onAdd(item)}
                >
                  <CoverCard
                    name={item.name}
                    kind={item.kind}
                    imageUrl={item.imageUrl}
                    variant="sm"
                  />
                  <span className="font-display text-sm">{item.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className="mt-6 space-y-4">
        {list.items.length === 0 && (
          <li className="text-sm text-muted">This list is empty.</li>
        )}
        {list.items.map((item) => {
          const already = Boolean(state.tracked[`${item.itemKind}:${item.itemId}`]);
          return (
            <li key={item.id} className="flex items-start gap-3">
              <Link href={`/${item.itemKind}/${item.itemId}`} className="pressable">
                <CoverCard
                  name={item.itemName}
                  kind={item.itemKind}
                  imageUrl={item.imageUrl}
                  variant="sm"
                />
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/${item.itemKind}/${item.itemId}`}
                  className="font-display tracking-wide"
                >
                  {item.itemName}
                </Link>
                {item.note && (
                  <p className="mt-1 font-display text-xs font-light text-white/70">
                    {item.note}
                  </p>
                )}
                <div className="mt-2 flex gap-3">
                  {!already && !own && (
                    <button
                      type="button"
                      className="font-display text-[11px] uppercase tracking-[0.14em] underline"
                      onClick={() =>
                        addFromFriend(
                          item.itemKind,
                          item.itemId,
                          person.displayName || person.handle,
                          item.itemName,
                          item.imageUrl,
                        )
                      }
                    >
                      Add to my list
                    </button>
                  )}
                  {own && (
                    <button
                      type="button"
                      className="font-display text-[11px] uppercase tracking-[0.14em] text-white/45"
                      onClick={() => void onRemove(item.itemKind, item.itemId)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
