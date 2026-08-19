export type CategoryKind =
  | "music"
  | "tv"
  | "movies"
  | "podcasts"
  | "books";

export type ScreenKind = CategoryKind | "friends";

export type TVStatus = "want" | "watching" | "finished" | "recommended";
export type BookStatus = "want" | "reading" | "finished" | "recommended";
export type MovieStatus = "want" | "watched" | "recommended";
export type FollowStatus = "following" | "recommended";
export type MyStatus = TVStatus | BookStatus | MovieStatus | FollowStatus;

export type CatalogItem = {
  id: string;
  kind: CategoryKind;
  name: string;
  genre?: string;
  genres?: string[];
  rating?: number;
  platform?: string;
  seasonCount?: number;
  runningStatus?: "running" | "ended";
  author?: string;
  nextDate?: string;
  nextLabel?: string;
  releaseDate?: string;
  notYetStreaming?: boolean;
  imageUrl?: string;
};

export type TrackedRecord = {
  itemId: string;
  kind: CategoryKind;
  myStatus: MyStatus;
  myRating: number;
  myReview: string;
  recommendedBy?: string;
  /** Cached title for live-catalog ids that aren't in the seed module. */
  itemName?: string;
  /** Cached poster/cover for list rows when browse page doesn't include the item. */
  imageUrl?: string;
};

export type Comment = {
  author: string;
  text: string;
  timestamp: string;
};

export type RecVisibility = "public" | "friends" | "direct";

export type Recommendation = {
  id: string;
  author: string;
  authorId: string;
  authorHandle: string;
  authorAvatarPath?: string | null;
  itemKind: CategoryKind;
  itemId: string;
  itemName: string;
  itemImageUrl?: string;
  note: string;
  timestamp: string;
  visibility: RecVisibility;
  pinned: boolean;
  reactions: Record<string, string[]>;
  comments: Comment[];
};

export type DiaryEntry = {
  itemId: string;
  kind: CategoryKind;
  name: string;
  dateFinished: string;
  personalRating: number;
};

export type AppNotification = {
  id: string;
  text: string;
  read: boolean;
  timestamp: string;
  link?: string;
};

export type PersistedState = {
  displayName: string;
  handle: string;
  bio: string;
  avatarPath: string | null;
  visibility: "public" | "friends" | "private";
  inviteCode: string;
  tracked: Record<string, TrackedRecord>;
  recommendations: Recommendation[];
  diary: DiaryEntry[];
  notifications: AppNotification[];
};
