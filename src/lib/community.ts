import type { Person, ProfileVisibility, SocialGraph, FriendshipState } from "./community-types";
import type { RecVisibility } from "./types";

export const STANDARD_LIST_SLUGS = [
  "currently-on",
  "loving",
  "finished",
] as const;

export function normalizeHandle(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 30);
}

export function handleIsValid(handle: string): boolean {
  return /^[a-z0-9_]{3,30}$/.test(handle);
}

export function slugFromTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return slug.length >= 2 ? slug : "list";
}

export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function profileLabel(person: {
  displayName?: string;
  handle?: string;
}): string {
  return person.displayName?.trim() || person.handle || "Someone";
}

export function avatarPublicUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/avatars/${path}`;
}

export function mapPerson(row: {
  id: string;
  handle: string | null;
  display_name: string;
  bio?: string | null;
  avatar_path?: string | null;
  visibility?: string | null;
}): Person {
  return {
    id: row.id,
    handle: row.handle || "user",
    displayName: row.display_name,
    bio: row.bio ?? "",
    avatarPath: row.avatar_path ?? null,
    visibility: (row.visibility as ProfileVisibility) || "public",
  };
}

export function invitePath(code: string): string {
  return `/join/${code}`;
}

export function friendshipOf(
  social: SocialGraph,
  personId: string,
): FriendshipState {
  if (social.friendIds.includes(personId)) return "friends";
  if (social.incomingRequestIds.includes(personId)) return "pending_in";
  if (social.outgoingRequestIds.includes(personId)) return "pending_out";
  return "none";
}

/** Scoped feed: own recs + friends (public/friends) + follows (public) + directs. */
export function recBelongsInFeed(opts: {
  viewerId: string;
  authorId: string;
  visibility: RecVisibility;
  friendIds: string[];
  followingIds: string[];
  sentToViewer: boolean;
}): boolean {
  if (opts.authorId === opts.viewerId) return true;
  if (opts.sentToViewer) return true;
  if (
    opts.friendIds.includes(opts.authorId) &&
    (opts.visibility === "public" || opts.visibility === "friends")
  ) {
    return true;
  }
  if (opts.followingIds.includes(opts.authorId) && opts.visibility === "public") {
    return true;
  }
  return false;
}
