"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { CATEGORY_META, MEDIA_KINDS } from "@/lib/categories";
import { getByKind, getItem } from "@/lib/catalog";
import { useTracker } from "@/lib/tracker";
import type { CategoryKind } from "@/lib/types";

export function FriendsScreen() {
  const {
    state,
    setDisplayName,
    recommend,
    react,
    comment,
    addFromFriend,
    reactions,
  } = useTracker();
  const [name, setName] = useState(state.displayName);
  const [kind, setKind] = useState<CategoryKind>("tv");
  const [itemId, setItemId] = useState("");
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState("all");
  const [thread, setThread] = useState<Record<string, string>>({});

  const trackedOfKind = useMemo(() => {
    return Object.values(state.tracked)
      .filter((t) => t.kind === kind)
      .map((t) => getItem(t.kind, t.itemId))
      .filter(Boolean);
  }, [state.tracked, kind]);

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
    recommend(kind, itemId, note.trim());
    setNote("");
  }

  if (!state.displayName) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <h1 className="font-display text-3xl">Friends</h1>
        <p className="mt-2 text-sm text-black/55">
          Choose a display name to join the shared recommendation feed.
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
      </div>
    );
  }

  return (
    <div>
      <div className="bg-[#F2B705] px-4 py-4 text-[#14161A]">
        <h1 className="font-display text-3xl">Friends</h1>
        <p className="text-sm">Posting as {state.displayName}</p>
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
            <option value="">Pick a tracked title</option>
            {(trackedOfKind.length
              ? trackedOfKind
              : getByKind(kind)
            ).map((item) =>
              item ? (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ) : null,
            )}
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
                      addFromFriend(r.itemKind, r.itemId, r.author)
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
