"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AuthSignIn } from "@/components/AuthSignIn";
import { AvatarMark } from "@/components/AvatarMark";
import { CoverCard, REEL_FEELS, StarRating } from "@/components/MediaBits";
import { SectionRule } from "@/components/SectionRule";
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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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
      <div className="mx-auto max-w-lg px-4">
        <AuthSignIn splash errorMessage={searchParams.get("error")} />
      </div>
    );
  }

  if (!state.displayName) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <h1 className="font-display text-[2.4rem] font-semibold italic leading-none">
          Friends
        </h1>
        <p className="mt-3 text-sm text-muted">
          Choose a display name tied to {userEmail ?? "your account"}.
        </p>
        <form onSubmit={onName} className="mt-5 flex gap-2">
          <input
            className="field flex-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
          <button className="btn-primary">Continue</button>
        </form>
        <button
          type="button"
          className="mt-4 font-display text-xs font-light uppercase tracking-[0.16em] text-muted underline"
          onClick={() => void signOut()}
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-6 pt-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[2.1rem] font-semibold italic leading-none">
            Friends
          </h1>
          <p className="mt-2 font-display text-sm font-light text-white/70">
            Posting as {state.displayName}
            <span className="ml-2 inline-flex items-center gap-1 font-display text-[10px] uppercase tracking-[0.16em] text-[var(--gold)]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--gold)]" />
              Live
            </span>
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 font-display text-[11px] font-light uppercase tracking-[0.16em] text-white/55"
          onClick={() => void signOut()}
        >
          Sign out
        </button>
      </div>

      <form onSubmit={onRec} className="panel mt-5 space-y-3 p-4">
        <p className="font-display text-lg font-semibold tracking-wide">
          Recommend something
        </p>
        <div className="scroll-x">
          {MEDIA_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setKind(k);
                setItemId("");
              }}
              className={`tab-link shrink-0 ${kind === k ? "is-active" : ""}`}
            >
              {CATEGORY_META[k].tab}
            </button>
          ))}
        </div>
        <select
          className="w-full rounded-2xl border border-white/20 bg-black/30 px-3 py-2.5 font-display text-sm font-light"
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
          className="min-h-20 w-full rounded-2xl border border-white/20 bg-transparent p-3 font-display text-sm font-light outline-none"
          placeholder="A short note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button className="btn-ghost">Share</button>
      </form>

      <div className="scroll-x mt-5">
        {friends.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 font-display text-xs font-light uppercase tracking-[0.14em] ${
              filter === f ? "bg-white text-black" : "text-white/50"
            }`}
          >
            {f === "all" ? "Everyone" : f}
          </button>
        ))}
      </div>

      <ul className="mt-5 space-y-8">
        {feed.length === 0 && (
          <li className="panel p-5">
            <p className="font-display text-lg">No recommendations yet</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {filter === "all"
                ? "Share something from your tracked list — friends will see it here in real time."
                : `Nothing from ${filter} yet.`}
            </p>
          </li>
        )}
        {feed.map((r) => {
          const already = Boolean(state.tracked[`${r.itemKind}:${r.itemId}`]);
          const seed = getItem(r.itemKind, r.itemId);
          const live = liveById[`${r.itemKind}:${r.itemId}`];
          const cover = seed ?? live;
          const feelEmojis = Object.entries(r.reactions)
            .filter(([, names]) => names.length > 0)
            .map(([e]) => e)
            .slice(0, 3);
          const shownFeels = feelEmojis.length > 0 ? feelEmojis : REEL_FEELS.slice(0, 3);
          const open = expanded[r.id];
          const preview =
            r.note.length > 140 && !open
              ? `${r.note.slice(0, 140).trim()}…`
              : r.note;
          const moreFromAuthor = state.recommendations
            .filter((x) => x.author === r.author && x.id !== r.id)
            .slice(0, 6);

          return (
            <li key={r.id}>
              <div className="mb-3 flex items-center gap-2">
                <AvatarMark size="sm" />
                <p className="font-display text-sm font-light tracking-wide">
                  {r.author}{" "}
                  <span className="font-display italic font-semibold tracking-wide text-[var(--suggest)]">
                    Suggests:
                  </span>
                </p>
              </div>
              <Link href={`/${r.itemKind}/${r.itemId}`} className="pressable block">
                {cover ? (
                  <CoverCard
                    name={cover.name}
                    kind={cover.kind}
                    imageUrl={cover.imageUrl}
                    rating={cover.rating}
                    variant="hero"
                  />
                ) : (
                  <div className="grid aspect-video place-items-center rounded-[14px] bg-white/5 font-display text-xl tracking-wide">
                    {r.itemName}
                  </div>
                )}
              </Link>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <StarRating value={cover?.rating ?? 0} size="sm" />
                  <span className="font-display text-sm font-semibold text-[var(--gold)]">
                    {CATEGORY_META[r.itemKind].tab}
                  </span>
                </div>
                <p className="font-display text-[11px] font-light uppercase tracking-[0.12em] text-[var(--cyan)]">
                  Reel Feels:{" "}
                  <span className="ml-1 text-base tracking-normal">
                    {shownFeels.join(" ")}
                  </span>
                </p>
              </div>
              <div className="panel relative mt-4 px-4 pb-8 pt-4">
                <p className="font-display text-lg font-semibold tracking-wide">
                  Why?
                </p>
                <p className="mt-2 font-display text-sm font-light leading-relaxed text-white/85">
                  {preview}
                </p>
                {r.note.length > 140 && (
                  <button
                    type="button"
                    className="mt-2 font-display text-xs font-light text-white/50"
                    onClick={() =>
                      setExpanded((s) => ({ ...s, [r.id]: !s[r.id] }))
                    }
                  >
                    {open ? "less" : "more..."}
                  </button>
                )}
                <AvatarMark
                  size="sm"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2"
                />
              </div>
              <div className="mt-6 flex flex-wrap gap-1.5">
                {reactions.map((e) => (
                  <button
                    key={e}
                    type="button"
                    className="pressable rounded-full bg-white/8 px-2.5 py-1 text-xs"
                    onClick={() => react(r.id, e)}
                  >
                    {e} {(r.reactions[e] || []).length || ""}
                  </button>
                ))}
              </div>
              {!already && (
                <button
                  type="button"
                  className="mt-3 font-display text-xs font-light uppercase tracking-[0.14em] underline"
                  onClick={() =>
                    addFromFriend(r.itemKind, r.itemId, r.author, r.itemName)
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
                <button className="font-display text-xs font-light uppercase tracking-[0.14em]">
                  Send
                </button>
              </form>
              {moreFromAuthor.length > 0 && (
                <div className="mt-6">
                  <SectionRule>More suggestions from {r.author}:</SectionRule>
                  <div className="scroll-x mt-3 pb-1">
                    {moreFromAuthor.map((extra) => {
                      const extraCover =
                        getItem(extra.itemKind, extra.itemId) ||
                        liveById[`${extra.itemKind}:${extra.itemId}`];
                      return (
                        <Link
                          key={extra.id}
                          href={`/${extra.itemKind}/${extra.itemId}`}
                          className="pressable w-[9.5rem] shrink-0"
                        >
                          {extraCover ? (
                            <CoverCard
                              name={extraCover.name}
                              kind={extraCover.kind}
                              imageUrl={extraCover.imageUrl}
                              rating={extraCover.rating}
                              variant="wide"
                            />
                          ) : (
                            <div className="grid h-[6.6rem] w-[9.5rem] place-items-center rounded-[14px] bg-white/5 font-display text-xs">
                              {extra.itemName}
                            </div>
                          )}
                          <p className="mt-2 truncate font-display text-xs tracking-wide">
                            {extra.itemName}
                          </p>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
