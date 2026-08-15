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
        t.kind !== "music" &&
        t.kind !== "podcasts"
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
      <div className="mx-auto max-w-lg px-4 py-8 text-sm text-muted">
        Loading…
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <h1 className="font-display text-[2.4rem] leading-none">Friends</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Sign in to join the shared recommendation feed. Catalog browsing still
          works as a guest.
        </p>
        <div className="mt-5">
          <AuthSignIn errorMessage={searchParams.get("error")} />
        </div>
      </div>
    );
  }

  if (!state.displayName) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <h1 className="font-display text-[2.4rem] leading-none">Friends</h1>
        <p className="mt-3 text-sm text-muted">
          Choose a display name tied to {userEmail ?? "your account"}.
        </p>
        <form onSubmit={onName} className="mt-5 flex gap-2">
          <input
            className="field flex-1 !rounded-2xl"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
          <button className="btn-primary bg-[var(--friends)] text-foreground">
            Continue
          </button>
        </form>
        <button
          type="button"
          className="mt-4 text-xs text-muted underline"
          onClick={() => void signOut()}
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="pb-4">
      <div
        className="px-4 py-5 text-foreground"
        style={{
          background:
            "linear-gradient(160deg, var(--friends) 0%, color-mix(in srgb, var(--friends) 70%, #111) 100%)",
        }}
      >
        <div className="mx-auto flex max-w-lg items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-[2.4rem] leading-none">Friends</h1>
            <p className="mt-1 text-sm opacity-80">
              Posting as {state.displayName}
              <span className="ml-2 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide opacity-90">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/80" />
                Live
              </span>
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 text-xs font-medium underline opacity-80"
            onClick={() => void signOut()}
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-lg space-y-5 px-4 pt-4">
        <form
          onSubmit={onRec}
          className="space-y-3 rounded-[1.35rem] bg-surface p-4"
        >
          <p className="font-display text-lg">Recommend something</p>
          <div className="scroll-x">
            {MEDIA_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setKind(k);
                  setItemId("");
                }}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                  kind === k ? "text-white" : "bg-[var(--surface-2)] text-muted"
                }`}
                style={
                  kind === k
                    ? {
                        background: CATEGORY_META[k].hex,
                        color: CATEGORY_META[k].onDark ? "#12141A" : "#fff",
                      }
                    : undefined
                }
              >
                {CATEGORY_META[k].label}
              </button>
            ))}
          </div>
          <select
            className="w-full rounded-2xl border border-[var(--hairline)] bg-[var(--background)] px-3 py-2.5 text-sm"
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
            className="min-h-20 w-full rounded-2xl border border-[var(--hairline)] bg-[var(--background)] p-3 text-sm outline-none"
            placeholder="A short note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button className="btn-primary bg-[var(--friends)] text-foreground">
            Share
          </button>
        </form>

        <div className="scroll-x">
          {friends.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                filter === f
                  ? "bg-foreground text-white"
                  : "bg-[var(--surface-2)] text-muted"
              }`}
            >
              {f === "all" ? "Everyone" : f}
            </button>
          ))}
        </div>

        <ul className="space-y-3">
          {feed.length === 0 && (
            <li className="rounded-[1.35rem] bg-surface p-5">
              <p className="font-display text-lg">No recommendations yet</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {filter === "all"
                  ? "Share something from your tracked list — friends will see it here in real time."
                  : `Nothing from ${filter} yet.`}
              </p>
            </li>
          )}
          {feed.map((r) => {
            const hex = CATEGORY_META[r.itemKind].hex;
            const already = Boolean(
              state.tracked[`${r.itemKind}:${r.itemId}`],
            );
            return (
              <li key={r.id} className="rounded-[1.35rem] bg-surface p-4">
                <div className="flex items-center gap-2">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-white"
                    style={{
                      background: hex,
                      color: CATEGORY_META[r.itemKind].onDark
                        ? "#12141A"
                        : "#fff",
                    }}
                  >
                    {CATEGORY_META[r.itemKind].label}
                  </span>
                  <span className="text-xs text-muted">{r.author}</span>
                </div>
                <Link
                  href={`/${r.itemKind}/${r.itemId}`}
                  className="mt-1 block font-display text-xl leading-tight"
                >
                  {r.itemName}
                </Link>
                <p className="mt-1 text-sm leading-relaxed text-foreground/80">
                  {r.note}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {reactions.map((e) => (
                    <button
                      key={e}
                      type="button"
                      className="pressable rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs"
                      onClick={() => react(r.id, e)}
                    >
                      {e} {(r.reactions[e] || []).length || ""}
                    </button>
                  ))}
                </div>
                {!already && (
                  <button
                    type="button"
                    className="mt-3 text-xs font-medium underline"
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
                <ul className="mt-3 space-y-1.5">
                  {r.comments.map((c, i) => (
                    <li key={i} className="text-xs text-muted">
                      <span className="font-display text-foreground">
                        {c.author}
                      </span>{" "}
                      {c.text}
                    </li>
                  ))}
                </ul>
                <form
                  className="mt-3 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const t = thread[r.id]?.trim();
                    if (!t) return;
                    comment(r.id, t);
                    setThread((s) => ({ ...s, [r.id]: "" }));
                  }}
                >
                  <input
                    className="field flex-1 !rounded-xl !py-2 text-xs"
                    placeholder="Comment"
                    value={thread[r.id] ?? ""}
                    onChange={(e) =>
                      setThread((s) => ({ ...s, [r.id]: e.target.value }))
                    }
                  />
                  <button className="text-xs font-semibold">Send</button>
                </form>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
