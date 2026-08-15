"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AuthSignIn } from "@/components/AuthSignIn";
import { CATEGORY_META, MEDIA_KINDS } from "@/lib/categories";
import { getItem } from "@/lib/catalog";
import { fetchCatalogItem } from "@/lib/catalog-client";
import { useTracker } from "@/lib/tracker";
import type { CatalogItem, CategoryKind } from "@/lib/types";

export function FriendsScreen() {
  const searchParams = useSearchParams();
  const {
    ready,
    signedIn,
    userEmail,
    state,
    setDisplayName,
    signOut,
    recommend,
    react,
    comment,
    addFromFriend,
    reactions,
  } = useTracker();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<CategoryKind>("tv");
  const [itemId, setItemId] = useState("");
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState("all");
  const [thread, setThread] = useState<Record<string, string>>({});
  const [liveById, setLiveById] = useState<Record<string, CatalogItem>>({});

  const trackedOfKind = useMemo(() => {
    const list: CatalogItem[] = [];
    for (const t of Object.values(state.tracked)) {
      if (t.kind !== kind) continue;
      const seed = getItem(t.kind, t.itemId);
      if (seed) {
        list.push(seed);
        continue;
      }
      const live = liveById[`${t.kind}:${t.itemId}`];
      if (live) {
        list.push(live);
        continue;
      }
      if (t.itemName) {
        list.push({ id: t.itemId, kind: t.kind, name: t.itemName });
      }
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [state.tracked, kind, liveById]);

  useEffect(() => {
    let cancelled = false;
    const missing = Object.values(state.tracked).filter((t) => {
      if (
        t.kind !== "tv" &&
        t.kind !== "movies" &&
        t.kind !== "books" &&
        t.kind !== "music"
      )
        return false;
      if (getItem(t.kind, t.itemId)) return false;
      if (t.itemName) return false;
      return !liveById[`${t.kind}:${t.itemId}`];
    });
    if (missing.length === 0) return;
    void Promise.all(
      missing.map(async (t) => {
        const item = await fetchCatalogItem(t.kind, t.itemId);
        if (!cancelled && item) {
          setLiveById((prev) => ({
            ...prev,
            [`${t.kind}:${t.itemId}`]: item,
          }));
        }
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [state.tracked, liveById]);

  const friends = [
    "all",
    ...new Set(state.recommendations.map((r) => r.author)),
  ];
  const feed =
    filter === "all"
      ? state.recommendations
      : state.recommendations.filter((r) => r.author === filter);

  function onName(e: FormEvent) {
    e.preventDefault();
    setDisplayName(name.trim());
  }

  function onRec(e: FormEvent) {
    e.preventDefault();
    if (!itemId || !note.trim()) return;
    const picked =
      trackedOfKind.find((i) => i.id === itemId) || getItem(kind, itemId);
    recommend(kind, itemId, note.trim(), picked?.name);
    setNote("");
  }

  if (!ready) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8 text-sm text-black/45">
        Loading…
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <h1 className="font-display text-3xl">Friends</h1>
        <p className="mt-2 text-sm text-black/55">
          Sign in to join the shared recommendation feed. Catalog browsing still
          works as a guest.
        </p>
        <div className="mt-4">
          <AuthSignIn errorMessage={searchParams.get("error")} />
        </div>
      </div>
    );
  }

  if (!state.displayName) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <h1 className="font-display text-3xl">Friends</h1>
        <p className="mt-2 text-sm text-black/55">
          Choose a display name tied to {userEmail ?? "your account"}.
        </p>
        <form onSubmit={onName} className="mt-4 flex gap-2">
          <input
            className="flex-1 rounded-xl border border-black/10 bg-[#F6F7F9] px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
          <button className="rounded-xl bg-[#F2B705] px-4 py-2 text-sm text-[#14161A]">
            Continue
          </button>
        </form>
        <button
          type="button"
          className="mt-4 text-xs text-black/45 underline"
          onClick={() => void signOut()}
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-[#F2B705] px-4 py-4 text-[#14161A]">
        <div className="mx-auto flex max-w-lg items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl">Friends</h1>
            <p className="text-sm">Posting as {state.displayName}</p>
          </div>
          <button
            type="button"
            className="shrink-0 text-xs underline"
            onClick={() => void signOut()}
          >
            Sign out
          </button>
        </div>
      </div>
      <div className="mx-auto max-w-lg space-y-4 px-3 py-4">
        <form
          onSubmit={onRec}
          className="space-y-2 rounded-2xl border border-black/8 bg-[#F6F7F9] p-3"
        >
          <p className="font-display">Recommend something</p>
          <div className="flex gap-2 overflow-x-auto">
            {MEDIA_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setKind(k);
                  setItemId("");
                }}
                className="rounded-full px-3 py-1 text-xs text-white"
                style={{ background: CATEGORY_META[k].hex }}
              >
                {CATEGORY_META[k].label}
              </button>
            ))}
          </div>
          <select
            className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
          >
            <option value="">
              {trackedOfKind.length
                ? "Pick a tracked title"
                : "Track something first"}
            </option>
            {trackedOfKind.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <textarea
            className="min-h-16 w-full rounded-xl border border-black/10 bg-white p-2 text-sm"
            placeholder="A short note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button className="rounded-full bg-[#F2B705] px-4 py-2 text-sm">
            Share
          </button>
        </form>

        <div className="flex gap-2 overflow-x-auto">
          {friends.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs ${filter === f ? "bg-[#F2B705]" : "bg-[#F6F7F9]"}`}
            >
              {f === "all" ? "Everyone" : f}
            </button>
          ))}
        </div>

        <ul className="space-y-3">
          {feed.map((r) => {
            const hex = CATEGORY_META[r.itemKind].hex;
            const already = Boolean(
              state.tracked[`${r.itemKind}:${r.itemId}`],
            );
            return (
              <li
                key={r.id}
                className="rounded-2xl border border-black/8 bg-white p-3"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] text-white"
                    style={{ background: hex }}
                  >
                    {CATEGORY_META[r.itemKind].label}
                  </span>
                  <span className="text-xs text-black/45">{r.author}</span>
                </div>
                <Link
                  href={`/${r.itemKind}/${r.itemId}`}
                  className="font-display text-lg"
                >
                  {r.itemName}
                </Link>
                <p className="text-sm">{r.note}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {reactions.map((e) => (
                    <button
                      key={e}
                      type="button"
                      className="rounded-full bg-[#F6F7F9] px-2 py-1 text-xs"
                      onClick={() => react(r.id, e)}
                    >
                      {e} {(r.reactions[e] || []).length || ""}
                    </button>
                  ))}
                </div>
                {!already && (
                  <button
                    type="button"
                    className="mt-2 text-xs underline"
                    onClick={() =>
                      addFromFriend(
                        r.itemKind,
                        r.itemId,
                        r.author,
                        r.itemName,
                      )
                    }
                  >
                    Add to my list
                  </button>
                )}
                <ul className="mt-2 space-y-1">
                  {r.comments.map((c, i) => (
                    <li key={i} className="text-xs text-black/70">
                      <span className="font-display">{c.author}</span> {c.text}
                    </li>
                  ))}
                </ul>
                <form
                  className="mt-2 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const t = thread[r.id]?.trim();
                    if (!t) return;
                    comment(r.id, t);
                    setThread((s) => ({ ...s, [r.id]: "" }));
                  }}
                >
                  <input
                    className="flex-1 rounded-xl border border-black/10 px-2 py-1 text-xs"
                    placeholder="Comment"
                    value={thread[r.id] ?? ""}
                    onChange={(e) =>
                      setThread((s) => ({ ...s, [r.id]: e.target.value }))
                    }
                  />
                  <button className="text-xs">Send</button>
                </form>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
