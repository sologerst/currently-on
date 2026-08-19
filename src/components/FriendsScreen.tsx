"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AuthSignIn } from "@/components/AuthSignIn";
import { InvitePanel } from "@/components/InvitePanel";
import { CoverCard, REEL_FEELS, StarRating } from "@/components/MediaBits";
import { PersonRow } from "@/components/PersonRow";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { RecommendComposer } from "@/components/RecommendComposer";
import { SectionRule } from "@/components/SectionRule";
import { CATEGORY_META } from "@/lib/categories";
import { getItem } from "@/lib/catalog";
import { fetchCatalogItem } from "@/lib/catalog-client";
import { looksLikeEmail } from "@/lib/community";
import {
  findPersonByEmail,
  searchPeople,
} from "@/lib/community-remote";
import type { Person } from "@/lib/community-types";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useTracker } from "@/lib/tracker";
import type { CatalogItem } from "@/lib/types";

const TABS = ["feed", "people", "invite"] as const;
type Tab = (typeof TABS)[number];

export function FriendsScreen() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab: Tab = TABS.includes(tabParam as Tab) ? (tabParam as Tab) : "feed";
  const {
    ready,
    signedIn,
    userEmail,
    userId,
    state,
    social,
    saveProfile,
    signOut,
    react,
    comment,
    addFromFriend,
    reactions,
  } = useTracker();
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [filter, setFilter] = useState("all");
  const [thread, setThread] = useState<Record<string, string>>({});
  const [liveById, setLiveById] = useState<Record<string, CatalogItem>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [peopleQuery, setPeopleQuery] = useState("");
  const [peopleHits, setPeopleHits] = useState<Person[]>([]);
  const [peopleMessage, setPeopleMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const missing = state.recommendations.filter((r) => {
      if (getItem(r.itemKind, r.itemId)) return false;
      if (r.itemImageUrl || r.itemName) return false;
      return !liveById[`${r.itemKind}:${r.itemId}`];
    });
    if (missing.length === 0) return;
    void Promise.all(
      missing.map(async (r) => {
        const item = await fetchCatalogItem(r.itemKind, r.itemId);
        if (!cancelled && item) {
          setLiveById((prev) => ({
            ...prev,
            [`${r.itemKind}:${r.itemId}`]: item,
          }));
        }
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [state.recommendations, liveById]);

  const authors = [
    "all",
    ...new Set(state.recommendations.map((r) => r.authorHandle || r.author)),
  ];
  const feed =
    filter === "all"
      ? state.recommendations
      : state.recommendations.filter(
          (r) => (r.authorHandle || r.author) === filter,
        );

  const incoming = social.incomingRequestIds
    .map((id) => social.people[id])
    .filter(Boolean) as Person[];
  const friends = social.friendIds
    .map((id) => social.people[id])
    .filter(Boolean) as Person[];
  const following = social.followingIds
    .map((id) => social.people[id])
    .filter(Boolean) as Person[];

  function onName(e: FormEvent) {
    e.preventDefault();
    void saveProfile({
      displayName: name.trim(),
      handle: handle.trim().toLowerCase() || undefined,
    });
  }

  async function onPeopleSearch(e: FormEvent) {
    e.preventDefault();
    const q = peopleQuery.trim();
    if (q.length < 2 || !isSupabaseConfigured()) return;
    setPeopleMessage(null);
    const supabase = createClient();
    try {
      const hits = looksLikeEmail(q)
        ? [await findPersonByEmail(supabase, q)].filter(Boolean)
        : await searchPeople(supabase, q);
      setPeopleHits(hits as Person[]);
      if ((hits as Person[]).length === 0) {
        setPeopleMessage("No one found. Try a handle or exact email.");
      }
    } catch (err) {
      setPeopleMessage(err instanceof Error ? err.message : "Search failed");
    }
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
          Choose a name and handle tied to {userEmail ?? "your account"}.
        </p>
        <form onSubmit={onName} className="mt-5 space-y-2">
          <input
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
          <input
            className="field"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="handle"
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
            {state.handle ? ` · @${state.handle}` : ""}
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

      <nav className="mt-5 flex gap-4">
        {TABS.map((id) => (
          <Link
            key={id}
            href={id === "feed" ? "/friends" : `/friends?tab=${id}`}
            className={`tab-link ${tab === id ? "is-active" : ""}`}
          >
            {id}
          </Link>
        ))}
      </nav>

      {tab === "invite" && (
        <div className="mt-5">
          <InvitePanel />
        </div>
      )}

      {tab === "people" && (
        <div className="mt-5 space-y-6">
          <form onSubmit={(e) => void onPeopleSearch(e)} className="flex gap-2">
            <input
              className="field flex-1"
              value={peopleQuery}
              onChange={(e) => setPeopleQuery(e.target.value)}
              placeholder="Handle or email"
            />
            <button className="btn-ghost">Find</button>
          </form>
          {peopleMessage && <p className="text-sm text-muted">{peopleMessage}</p>}
          {peopleHits.length > 0 && (
            <ul className="divide-y divide-white/10">
              {peopleHits.map((p) => (
                <PersonRow key={p.id} person={p} />
              ))}
            </ul>
          )}
          {incoming.length > 0 && (
            <section>
              <SectionRule>Requests</SectionRule>
              <ul>
                {incoming.map((p) => (
                  <PersonRow key={p.id} person={p} />
                ))}
              </ul>
            </section>
          )}
          <section>
            <SectionRule>Friends</SectionRule>
            {friends.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                Invite someone with your link, or search a handle.
              </p>
            ) : (
              <ul>
                {friends.map((p) => (
                  <PersonRow key={p.id} person={p} />
                ))}
              </ul>
            )}
          </section>
          <section>
            <SectionRule>Following</SectionRule>
            {following.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                Follow public profiles to see what they love.
              </p>
            ) : (
              <ul>
                {following.map((p) => (
                  <PersonRow key={p.id} person={p} />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {tab === "feed" && (
        <>
          <RecommendComposer />

          <div className="scroll-x mt-5">
            {authors.map((f) => (
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
                  Invite someone, follow a person, then send a title with a why.
                </p>
                <Link href="/friends?tab=invite" className="btn-primary mt-4">
                  Invite
                </Link>
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
              const shownFeels =
                feelEmojis.length > 0 ? feelEmojis : REEL_FEELS.slice(0, 3);
              const open = expanded[r.id];
              const preview =
                r.note.length > 140 && !open
                  ? `${r.note.slice(0, 140).trim()}…`
                  : r.note;
              const moreFromAuthor = state.recommendations
                .filter((x) => x.authorId === r.authorId && x.id !== r.id)
                .slice(0, 6);
              const isDirect = r.visibility === "direct";

              return (
                <li key={r.id}>
                  <div className="mb-3 flex items-center gap-2">
                    <Link href={`/u/${r.authorHandle}`} className="pressable">
                      <ProfileAvatar
                        path={r.authorAvatarPath}
                        name={r.author}
                        size="sm"
                      />
                    </Link>
                    <p className="font-display text-sm font-light tracking-wide">
                      <Link href={`/u/${r.authorHandle}`}>{r.author}</Link>{" "}
                      <span className="font-display italic font-semibold tracking-wide text-[var(--suggest)]">
                        {isDirect ? "sent you:" : "Suggests:"}
                      </span>
                    </p>
                  </div>
                  <Link
                    href={`/${r.itemKind}/${r.itemId}`}
                    className="pressable block"
                  >
                    {cover ? (
                      <CoverCard
                        name={cover.name}
                        kind={cover.kind}
                        imageUrl={cover.imageUrl || r.itemImageUrl}
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
                    <ProfileAvatar
                      path={r.authorAvatarPath}
                      name={r.author}
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
                  {!already && r.authorId !== userId && (
                    <button
                      type="button"
                      className="mt-3 font-display text-xs font-light uppercase tracking-[0.14em] underline"
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
                    <button className="font-display text-xs font-light uppercase tracking-[0.14em]">
                      Send
                    </button>
                  </form>
                  {moreFromAuthor.length > 0 && (
                    <div className="mt-6">
                      <SectionRule>
                        More suggestions from {r.author}:
                      </SectionRule>
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
                                  imageUrl={
                                    extraCover.imageUrl || extra.itemImageUrl
                                  }
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
        </>
      )}
    </div>
  );
}
