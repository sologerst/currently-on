"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CoverCard } from "@/components/MediaBits";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { fetchCatalogSearch } from "@/lib/catalog-client";
import { friendshipOf, profileLabel } from "@/lib/community";
import type { Person } from "@/lib/community-types";
import { useTracker } from "@/lib/tracker";
import type { CatalogItem, CategoryKind, RecVisibility } from "@/lib/types";

export function RecommendComposer({
  preset,
}: {
  preset?: {
    kind: CategoryKind;
    id: string;
    name: string;
    imageUrl?: string;
  };
}) {
  const { social, recommend, pinLoved, signedIn } = useTracker();
  const [query, setQuery] = useState(preset?.name ?? "");
  const [hits, setHits] = useState<CatalogItem[]>([]);
  const [picked, setPicked] = useState<CatalogItem | null>(
    preset
      ? {
          id: preset.id,
          kind: preset.kind,
          name: preset.name,
          imageUrl: preset.imageUrl,
        }
      : null,
  );
  const [note, setNote] = useState("");
  const [toFriends, setToFriends] = useState(true);
  const [toProfile, setToProfile] = useState(false);
  const [pin, setPin] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const people = useMemo(() => {
    const ids = [...new Set([...social.friendIds, ...social.followingIds])];
    return ids
      .map((id) => social.people[id])
      .filter((p): p is Person => Boolean(p));
  }, [social]);

  useEffect(() => {
    const q = query.trim();
    if (preset || q.length < 2) return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      void fetchCatalogSearch(q).then((items) => {
        if (!cancelled) setHits(items.slice(0, 8));
      });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query, preset]);

  const shownHits = preset || query.trim().length < 2 ? [] : hits;

  if (!signedIn) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!picked || !note.trim()) return;
    const hasPeople = selected.length > 0;
    if (!toFriends && !toProfile && !hasPeople && !pin) {
      setMessage("Pick friends, your profile, people, or Loving.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      if (pin && !toFriends && !toProfile && !hasPeople) {
        await pinLoved({
          kind: picked.kind,
          id: picked.id,
          name: picked.name,
          imageUrl: picked.imageUrl,
          note: note.trim(),
        });
      } else {
        let visibility: RecVisibility = "friends";
        if (toProfile) visibility = "public";
        else if (hasPeople && !toFriends) visibility = "direct";
        recommend({
          kind: picked.kind,
          id: picked.id,
          note: note.trim(),
          itemName: picked.name,
          imageUrl: picked.imageUrl,
          visibility,
          recipientIds: selected,
          pinToProfile: pin || toProfile,
        });
      }
      setNote("");
      setSelected([]);
      if (!preset) {
        setPicked(null);
        setQuery("");
      }
      setMessage("Shared.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="panel mt-5 space-y-3 p-4">
      <p className="font-display text-lg font-semibold tracking-wide">
        Recommend something
      </p>
      <p className="font-display text-xs font-light text-white/55">
        You do not need to track it first. Add a why-note.
      </p>
      {!preset && (
        <>
          <input
            className="field"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPicked(null);
            }}
            placeholder="Search a movie, show, podcast…"
          />
          {shownHits.length > 0 && !picked && (
            <ul className="max-h-48 space-y-1 overflow-auto">
              {shownHits.map((item) => (
                <li key={`${item.kind}:${item.id}`}>
                  <button
                    type="button"
                    className="pressable flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left"
                    onClick={() => {
                      setPicked(item);
                      setQuery(item.name);
                      setHits([]);
                    }}
                  >
                    <CoverCard
                      name={item.name}
                      kind={item.kind}
                      imageUrl={item.imageUrl}
                      variant="sm"
                    />
                    <span className="min-w-0 truncate font-display text-sm">
                      {item.name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {picked && (
        <p className="font-display text-sm text-[var(--gold)]">{picked.name}</p>
      )}
      <textarea
        className="min-h-20 w-full rounded-2xl border border-white/20 bg-transparent p-3 font-display text-sm font-light outline-none"
        placeholder="Why this — what clicked for you"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        required
      />
      <label className="flex items-center gap-2 font-display text-xs uppercase tracking-[0.14em] text-white/70">
        <input
          type="checkbox"
          checked={toFriends}
          onChange={(e) => setToFriends(e.target.checked)}
        />
        Friends feed
      </label>
      <label className="flex items-center gap-2 font-display text-xs uppercase tracking-[0.14em] text-white/70">
        <input
          type="checkbox"
          checked={toProfile}
          onChange={(e) => setToProfile(e.target.checked)}
        />
        Public profile
      </label>
      <label className="flex items-center gap-2 font-display text-xs uppercase tracking-[0.14em] text-white/70">
        <input
          type="checkbox"
          checked={pin}
          onChange={(e) => setPin(e.target.checked)}
        />
        Pin to Loving
      </label>
      {people.length > 0 && (
        <div>
          <p className="mb-2 font-display text-[11px] uppercase tracking-[0.16em] text-white/45">
            Send to
          </p>
          <div className="flex flex-wrap gap-2">
            {people.map((person) => {
              const on = selected.includes(person.id);
              const relation = friendshipOf(social, person.id);
              return (
                <button
                  key={person.id}
                  type="button"
                  onClick={() =>
                    setSelected((curr) =>
                      on ? curr.filter((id) => id !== person.id) : [...curr, person.id],
                    )
                  }
                  className={`pressable flex items-center gap-1.5 rounded-full px-2 py-1 ${
                    on ? "bg-white text-black" : "bg-white/10 text-white/80"
                  }`}
                >
                  <ProfileAvatar
                    path={person.avatarPath}
                    name={profileLabel(person)}
                    size="sm"
                  />
                  <span className="font-display text-[11px]">
                    {profileLabel(person)}
                    {relation === "friends" ? "" : " · follow"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <button className="btn-ghost" disabled={busy || !picked || !note.trim()}>
        {busy ? "Sharing…" : "Share"}
      </button>
      {message && <p className="text-sm text-muted">{message}</p>}
    </form>
  );
}
