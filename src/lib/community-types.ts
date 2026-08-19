import type { CategoryKind, RecVisibility } from "./types";

export type ProfileVisibility = "public" | "friends" | "private";
export type ListVisibility = "private" | "friends" | "public";
export type ListKind = "standard" | "custom";
export type FriendshipState =
  | "none"
  | "pending_out"
  | "pending_in"
  | "friends";

export type Person = {
  id: string;
  handle: string;
  displayName: string;
  bio: string;
  avatarPath: string | null;
  visibility: ProfileVisibility;
};

export type OwnProfile = Person & {
  inviteCode: string;
  createdAt: string;
};

export type MediaListItem = {
  id: string;
  itemKind: CategoryKind;
  itemId: string;
  itemName: string;
  imageUrl?: string;
  note: string;
  position: number;
};

export type MediaList = {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  slug: string;
  kind: ListKind;
  visibility: ListVisibility;
  items: MediaListItem[];
};

export type SocialGraph = {
  followingIds: string[];
  followerIds: string[];
  friendIds: string[];
  incomingRequestIds: string[];
  outgoingRequestIds: string[];
  people: Record<string, Person>;
};

export type RecommendInput = {
  kind: CategoryKind;
  id: string;
  note: string;
  itemName: string;
  imageUrl?: string;
  visibility: RecVisibility;
  recipientIds: string[];
  pinToProfile: boolean;
};
