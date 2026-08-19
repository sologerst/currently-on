"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { CoverCard } from "@/components/MediaBits";
import { PeopleActions } from "@/components/PersonRow";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { RecommendComposer } from "@/components/RecommendComposer";
import { SectionRule } from "@/components/SectionRule";
import { handleIsValid, profileLabel } from "@/lib/community";
import {
  loadLists,
  loadProfileByHandle,
  loadPublicRecommendations,
} from "@/lib/community-remote";
import type { MediaList, Person } from "@/lib/community-types";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useTracker } from "@/lib/tracker";
import type { ProfileVisibility } from "@/lib/community-types";
import type { Recommendation } from "@/lib/types";

export function ProfileScreen({
  handle,
  isOwn,
}: {
  handle?: string;
  isOwn?: boolean;
}) {
  const {
    ready,
    signedIn,
    state,
    lists: ownLists,
    userId,
    saveProfile,
    saveAvatar,
    createList,
  } = useTracker();
  const own = Boolean(isOwn || (handle && handle === state.handle));
  const ownPerson: Person = {
    id: userId || "me",
    handle: state.handle || "you",
    displayName: state.displayName,
    bio: state.bio,
    avatarPath: state.avatarPath,
    visibility: state.visibility,
  };
  const [remotePerson, setRemotePerson] = useState<Person | null>(null);
  const [remoteLists, setRemoteLists] = useState<MediaList[]>([]);
  const [remoteRecs, setRemoteRecs] = useState<Recommendation[]>([]);
  const [missing, setMissing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(state.displayName);
  const [nextHandle, setNextHandle] = useState(state.handle);
  const [bio, setBio] = useState(state.bio);
  const [visibility, setVisibility] = useState<ProfileVisibility>(state.visibility);
  const [listTitle, setListTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (own || !handle || !isSupabaseConfigured()) return;
    let cancelled = false;
    const supabase = createClient();
    void (async () => {
      try {
        const profile = await loadProfileByHandle(supabase, handle);
        if (cancelled) return;
        if (!profile) {
          setMissing(true);
          setRemotePerson(null);
          return;
        }
        setRemotePerson(profile);
        const [nextLists, nextRecs] = await Promise.all([
          loadLists(supabase, profile.id),
          loadPublicRecommendations(supabase, profile.id),
        ]);
        if (!cancelled) {
          setRemoteLists(nextLists);
          setRemoteRecs(nextRecs);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setMissing(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [handle, own]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (nextHandle && !handleIsValid(nextHandle)) {
      setError("Handle must be 3–30 characters: a–z, 0–9, underscore.");
      return;
    }
    setError(null);
    await saveProfile({
      displayName: name.trim(),
      handle: nextHandle.trim(),
      bio: bio.trim(),
      visibility,
    });
    setEditing(false);
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    await saveAvatar(file);
  }

  async function onCreateList(e: FormEvent) {
    e.preventDefault();
    if (!listTitle.trim()) return;
    await createList({
      title: listTitle.trim(),
      description: "",
      visibility: "public",
    });
    setListTitle("");
  }

  const person = own ? ownPerson : remotePerson;
  const lists = own ? ownLists : remoteLists;
  const recs = own
    ? state.recommendations.filter(
        (r) =>
          r.visibility === "public" &&
          (userId ? r.authorId === userId : r.authorHandle === state.handle),
      )
    : remoteRecs;

  if (!ready || (!own && !person && !missing)) {
    return <p className="px-4 py-8 text-sm text-muted">Loading…</p>;
  }

  if (missing || !person) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <h1 className="font-display text-3xl">Profile not found</h1>
        <p className="mt-2 text-sm text-muted">
          This handle is private or does not exist.
        </p>
      </div>
    );
  }

  const label = profileLabel(person);
  const currentlyOn = lists.find((l) => l.slug === "currently-on");
  const loving = lists.find((l) => l.slug === "loving");
  const custom = lists.filter((l) => l.kind === "custom");

  return (
    <div className="mx-auto max-w-lg px-4 pb-8 pt-3">
      <div className="flex gap-4">
        <label className={own ? "pressable cursor-pointer" : ""}>
          <ProfileAvatar path={person.avatarPath} name={label} size="lg" ring />
          {own && (
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => void onPhoto(e.target.files?.[0])}
            />
          )}
        </label>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-medium uppercase tracking-[0.12em] text-[var(--gold)]">
            {label}
          </p>
          <p className="font-display text-xs font-light text-white/50">
            @{person.handle}
          </p>
          {person.bio && (
            <p className="mt-2 font-display text-sm font-light text-white/80">
              {person.bio}
            </p>
          )}
          <div className="mt-3">
            {own ? (
              <button
                type="button"
                className="font-display text-[11px] uppercase tracking-[0.16em] text-[var(--gold)]"
                onClick={() => {
                  setName(state.displayName);
                  setNextHandle(state.handle);
                  setBio(state.bio);
                  setVisibility(state.visibility);
                  setEditing((v) => !v);
                }}
              >
                {editing ? "Close" : "Edit profile"}
              </button>
            ) : (
              <PeopleActions person={person} />
            )}
          </div>
        </div>
      </div>

      {own && editing && (
        <form onSubmit={(e) => void onSave(e)} className="panel mt-5 space-y-3 p-4">
          <input
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Display name"
          />
          <input
            className="field"
            value={nextHandle}
            onChange={(e) => setNextHandle(e.target.value.toLowerCase())}
            placeholder="handle"
          />
          <textarea
            className="min-h-20 w-full rounded-2xl border border-white/20 bg-transparent p-3 font-display text-sm outline-none"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A short bio"
          />
          <select
            className="field"
            value={visibility}
            onChange={(e) =>
              setVisibility(e.target.value as ProfileVisibility)
            }
          >
            <option value="public">Public profile</option>
            <option value="friends">Friends only</option>
            <option value="private">Private</option>
          </select>
          {error && <p className="text-sm text-muted">{error}</p>}
          <button className="btn-primary">Save</button>
        </form>
      )}

      {own && signedIn && (
        <div className="mt-6">
          <RecommendComposer />
        </div>
      )}

      {currentlyOn && currentlyOn.items.length > 0 && (
        <section className="mt-8">
          <SectionRule>Currently On</SectionRule>
          <div className="scroll-x mt-3">
            {currentlyOn.items.map((item) => (
              <Link
                key={item.id}
                href={`/${item.itemKind}/${item.itemId}`}
                className="pressable w-[7.5rem] shrink-0"
              >
                <CoverCard
                  name={item.itemName}
                  kind={item.itemKind}
                  imageUrl={item.imageUrl}
                  variant="tile"
                />
                <p className="mt-2 truncate font-display text-xs">
                  {item.itemName}
                </p>
              </Link>
            ))}
          </div>
          <Link
            href={`/u/${person.handle}/lists/currently-on`}
            className="mt-2 inline-block font-display text-[11px] uppercase tracking-[0.16em] text-white/45"
          >
            Full list
          </Link>
        </section>
      )}

      {loving && (
        <section className="mt-8">
          <SectionRule>Loving</SectionRule>
          {loving.items.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              {own
                ? "Pin something you really love, with a why."
                : "Nothing pinned yet."}
            </p>
          ) : (
            <ul className="mt-3 space-y-4">
              {loving.items.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <Link href={`/${item.itemKind}/${item.itemId}`}>
                    <CoverCard
                      name={item.itemName}
                      kind={item.itemKind}
                      imageUrl={item.imageUrl}
                      variant="sm"
                    />
                  </Link>
                  <div>
                    <Link
                      href={`/${item.itemKind}/${item.itemId}`}
                      className="font-display text-sm tracking-wide"
                    >
                      {item.itemName}
                    </Link>
                    {item.note && (
                      <p className="mt-1 font-display text-xs font-light text-white/70">
                        {item.note}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="mt-8">
        <SectionRule>Lists</SectionRule>
        <ul className="mt-3 space-y-2">
          {lists.map((list) => (
            <li key={list.id}>
              <Link
                href={`/u/${person.handle}/lists/${list.slug}`}
                className="pressable flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3"
              >
                <span className="font-display tracking-wide">{list.title}</span>
                <span className="font-display text-xs text-white/45">
                  {list.items.length}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {own && (
          <form onSubmit={(e) => void onCreateList(e)} className="mt-4 flex gap-2">
            <input
              className="field flex-1"
              value={listTitle}
              onChange={(e) => setListTitle(e.target.value)}
              placeholder="New list title"
            />
            <button className="btn-ghost">Add</button>
          </form>
        )}
        {custom.length === 0 && !own && lists.length === 0 && (
          <p className="mt-3 text-sm text-muted">No shared lists yet.</p>
        )}
      </section>

      {recs.length > 0 && (
        <section className="mt-8">
          <SectionRule>Public recs</SectionRule>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {recs.slice(0, 6).map((r) => (
              <Link
                key={r.id}
                href={`/${r.itemKind}/${r.itemId}`}
                className="pressable"
              >
                <CoverCard
                  name={r.itemName}
                  kind={r.itemKind}
                  imageUrl={r.itemImageUrl}
                  variant="wide"
                />
                <p className="mt-2 truncate font-display text-xs">{r.itemName}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
