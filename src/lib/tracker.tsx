"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { defaultStatus, isFinishedStatus } from "./categories";
import { getCatalog, getItem, seedTrackedIds } from "./catalog";
import type {
  ListVisibility,
  MediaList,
  RecommendInput,
  SocialGraph,
} from "./community-types";
import {
  createCustomList as createCustomListRemote,
  deleteCustomList,
  followUser,
  loadLists,
  loadSocialGraph,
  redeemInvite,
  requestFriend,
  respondFriend,
  rotateInviteCode,
  blockPerson,
  unblockPerson,
  unfriend,
  unfollowUser,
  updateListMeta,
  updateProfile as updateProfileRemote,
  uploadAvatar,
  pinToLoving,
} from "./community-remote";
import { createClient, isSupabaseConfigured } from "./supabase/client";
import {
  deleteTracked,
  insertComment,
  insertNotification,
  insertRecommendation,
  loadRecommendations,
  loadRemoteState,
  markNotificationsRead,
  toggleReaction,
  upsertDiary,
  upsertTracked,
} from "./tracker-remote";
import type {
  AppNotification,
  CategoryKind,
  DiaryEntry,
  MyStatus,
  PersistedState,
  Recommendation,
  RecVisibility,
  TrackedRecord,
} from "./types";

const STORAGE_KEY = "currently-on-v1";
const REACTIONS = ["👍", "❤️", "😂", "🔥", "👀"];

function trackKey(kind: CategoryKind, id: string) {
  return `${kind}:${id}`;
}

function emptyGuestState(): PersistedState {
  const tracked: Record<string, TrackedRecord> = {};
  for (const id of seedTrackedIds()) {
    const item = getCatalog().find((i) => i.id === id);
    if (!item) continue;
    tracked[trackKey(item.kind, item.id)] = {
      itemId: item.id,
      kind: item.kind,
      myStatus: defaultStatus(item.kind) as MyStatus,
      myRating: 0,
      myReview: "",
    };
  }

  const now = new Date().toISOString();
  return {
    displayName: "",
    handle: "",
    bio: "",
    avatarPath: null,
    visibility: "public",
    inviteCode: "",
    tracked,
    recommendations: [
      {
        id: "rec-demo-1",
        author: "Sam",
        authorId: "demo-sam",
        authorHandle: "sam",
        itemKind: "tv",
        itemId: "tv-4",
        itemName: "County Line",
        note: "Start with season 2 — it clicks.",
        timestamp: now,
        visibility: "friends",
        pinned: false,
        reactions: { "🔥": ["Sam"] },
        comments: [],
      },
      {
        id: "rec-demo-2",
        author: "Jules",
        authorId: "demo-jules",
        authorHandle: "jules",
        itemKind: "books",
        itemId: "bk-3",
        itemName: "Signal Loss",
        note: "One sitting. Trust me.",
        timestamp: now,
        visibility: "friends",
        pinned: false,
        reactions: {},
        comments: [],
      },
    ],
    diary: [],
    notifications: [
      {
        id: "n1",
        text: "Harbor Lights S3E6 airs Aug 21",
        read: false,
        timestamp: now,
      },
      {
        id: "n2",
        text: "Jules recommended Signal Loss",
        read: false,
        timestamp: now,
      },
    ],
  };
}

function emptyAccountState(): PersistedState {
  return {
    displayName: "",
    handle: "",
    bio: "",
    avatarPath: null,
    visibility: "public",
    inviteCode: "",
    tracked: {},
    recommendations: [],
    diary: [],
    notifications: [],
  };
}

function emptySocial(): SocialGraph {
  return {
    followingIds: [],
    followerIds: [],
    friendIds: [],
    incomingRequestIds: [],
    outgoingRequestIds: [],
    people: {},
  };
}

function loadGuest(): PersistedState {
  if (typeof window === "undefined") return emptyGuestState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyGuestState();
    return { ...emptyGuestState(), ...JSON.parse(raw) };
  } catch {
    return emptyGuestState();
  }
}

type TrackerApi = {
  ready: boolean;
  signedIn: boolean;
  userId: string | null;
  userEmail: string | null;
  state: PersistedState;
  social: SocialGraph;
  lists: MediaList[];
  refreshCommunity: () => Promise<void>;
  signOut: () => Promise<void>;
  setDisplayName: (name: string) => void;
  saveProfile: (patch: {
    displayName?: string;
    handle?: string;
    bio?: string;
    visibility?: PersistedState["visibility"];
  }) => Promise<void>;
  saveAvatar: (file: File) => Promise<void>;
  pinLoved: (item: {
    kind: CategoryKind;
    id: string;
    name: string;
    imageUrl?: string;
    note: string;
  }) => Promise<void>;
  follow: (targetId: string) => Promise<void>;
  unfollow: (targetId: string) => Promise<void>;
  addFriend: (targetId: string) => Promise<void>;
  acceptFriend: (otherId: string) => Promise<void>;
  declineFriend: (otherId: string) => Promise<void>;
  removeFriend: (otherId: string) => Promise<void>;
  blockUser: (otherId: string) => Promise<void>;
  unblockUser: (otherId: string) => Promise<void>;
  rotateInvite: () => Promise<string>;
  redeemInviteCode: (code: string) => Promise<string>;
  createList: (input: {
    title: string;
    description: string;
    visibility: ListVisibility;
  }) => Promise<MediaList | null>;
  saveList: (
    listId: string,
    patch: { title?: string; description?: string; visibility?: ListVisibility },
  ) => Promise<void>;
  removeList: (listId: string) => Promise<void>;
  track: (
    kind: CategoryKind,
    id: string,
    status?: MyStatus,
    itemName?: string,
    imageUrl?: string,
  ) => void;
  untrack: (kind: CategoryKind, id: string) => void;
  getTracked: (kind: CategoryKind, id: string) => TrackedRecord | undefined;
  setStatus: (
    kind: CategoryKind,
    id: string,
    status: MyStatus,
    itemName?: string,
    imageUrl?: string,
  ) => void;
  setRating: (kind: CategoryKind, id: string, rating: number) => void;
  setReview: (kind: CategoryKind, id: string, review: string) => void;
  recommend: (input: RecommendInput) => void;
  react: (recId: string, emoji: string) => void;
  comment: (recId: string, text: string) => void;
  addFromFriend: (
    kind: CategoryKind,
    id: string,
    friend: string,
    itemName?: string,
    imageUrl?: string,
  ) => void;
  markAllRead: () => void;
  reactions: string[];
};

const Ctx = createContext<TrackerApi | null>(null);

export function TrackerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(emptyGuestState);
  const [social, setSocial] = useState<SocialGraph>(emptySocial);
  const [lists, setLists] = useState<MediaList[]>([]);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const userIdRef = useRef<string | null>(null);
  const signedIn = Boolean(user);

  const refreshCommunity = useCallback(async (userId?: string) => {
    const id = userId ?? userIdRef.current;
    if (!id || !isSupabaseConfigured()) {
      setSocial(emptySocial());
      setLists([]);
      return;
    }
    const supabase = createClient();
    try {
      let nextLists = await loadLists(supabase, id);
      if (nextLists.length === 0) {
        await supabase.rpc("ensure_standard_lists", { p_user_id: id });
        nextLists = await loadLists(supabase, id);
      }
      const nextSocial = await loadSocialGraph(supabase, id);
      setSocial(nextSocial);
      setLists(nextLists);
    } catch (err) {
      console.error("Failed to load community graph", err);
    }
  }, []);

  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (!isSupabaseConfigured()) {
        setState(loadGuest());
        setReady(true);
        return;
      }

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (session?.user) {
        setUser(session.user);
        try {
          const remote = await loadRemoteState(supabase, session.user.id);
          if (!cancelled) setState(remote);
          if (!cancelled) await refreshCommunity(session.user.id);
        } catch (err) {
          console.error("Failed to load remote tracker state", err);
          if (!cancelled) setState(emptyAccountState());
        }
      } else {
        setUser(null);
        setState(loadGuest());
        setSocial(emptySocial());
        setLists([]);
      }
      if (!cancelled) setReady(true);
    }

    void boot();

    if (!isSupabaseConfigured()) return;

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "INITIAL_SESSION") return;
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        try {
          const remote = await loadRemoteState(supabase, nextUser.id);
          setState(remote);
          await refreshCommunity(nextUser.id);
        } catch (err) {
          console.error("Failed to refresh remote tracker state", err);
          setState(emptyAccountState());
        }
      } else {
        setState(loadGuest());
        setSocial(emptySocial());
        setLists([]);
      }
      setReady(true);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [refreshCommunity]);

  useEffect(() => {
    if (!ready || signedIn) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, ready, signedIn]);

  // Live Friends feed — refresh recommendations when peers post/react/comment.
  useEffect(() => {
    if (!signedIn || !isSupabaseConfigured()) return;

    const supabase = createClient();
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const scheduleCommunity = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        void (async () => {
          try {
            const [recommendations, notificationsRes] = await Promise.all([
              loadRecommendations(supabase),
              supabase
                .from("notifications")
                .select("*")
                .eq("user_id", userIdRef.current ?? "")
                .order("created_at", { ascending: false }),
            ]);
            if (!cancelled) {
              setState((s) => ({
                ...s,
                recommendations,
                notifications: (notificationsRes.data ?? []).map((row) => ({
                  id: row.id,
                  text: row.text,
                  read: row.read,
                  timestamp: row.created_at,
                  link: row.link ?? undefined,
                })),
              }));
            }
            await refreshCommunity();
          } catch (err) {
            console.error("Failed to refresh friends feed", err);
          }
        })();
      }, 250);
    };

    const channel = supabase
      .channel("friends-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "recommendations" },
        scheduleCommunity,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "recommendation_reactions" },
        scheduleCommunity,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "recommendation_comments" },
        scheduleCommunity,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "follows" },
        scheduleCommunity,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friendships" },
        scheduleCommunity,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        scheduleCommunity,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lists" },
        scheduleCommunity,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "list_items" },
        scheduleCommunity,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "recommendation_recipients" },
        scheduleCommunity,
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [signedIn, refreshCommunity]);

  const patch = useCallback((fn: (s: PersistedState) => PersistedState) => {
    setState((s) => fn(s));
  }, []);

  const withRemote = useCallback(
    async (fn: (userId: string) => Promise<void>) => {
      const userId = userIdRef.current;
      if (!userId || !isSupabaseConfigured()) return;
      try {
        await fn(userId);
      } catch (err) {
        console.error(err);
      }
    },
    [],
  );

  const api = useMemo<TrackerApi>(() => {
    const getTracked = (kind: CategoryKind, id: string) =>
      state.tracked[trackKey(kind, id)];

    const ensure = (
      s: PersistedState,
      kind: CategoryKind,
      id: string,
      extra?: Partial<TrackedRecord>,
    ) => {
      const k = trackKey(kind, id);
      const existing = s.tracked[k];
      const next: TrackedRecord = existing ?? {
        itemId: id,
        kind,
        myStatus: defaultStatus(kind) as MyStatus,
        myRating: 0,
        myReview: "",
      };
      s.tracked[k] = { ...next, ...extra };
      return s.tracked[k];
    };

    return {
      ready,
      signedIn,
      userId: user?.id ?? null,
      userEmail: user?.email ?? null,
      state,
      social,
      lists,
      refreshCommunity: () => refreshCommunity(),
      reactions: REACTIONS,
      signOut: async () => {
        if (!isSupabaseConfigured()) return;
        const supabase = createClient();
        await supabase.auth.signOut();
      },
      setDisplayName: (name) => {
        patch((s) => ({ ...s, displayName: name }));
        void withRemote(async (userId) => {
          const supabase = createClient();
          await updateProfileRemote(supabase, userId, { displayName: name });
        });
      },
      saveProfile: async (profilePatch) => {
        patch((s) => ({
          ...s,
          displayName: profilePatch.displayName ?? s.displayName,
          handle: profilePatch.handle ?? s.handle,
          bio: profilePatch.bio ?? s.bio,
          visibility: profilePatch.visibility ?? s.visibility,
        }));
        await withRemote(async (userId) => {
          const supabase = createClient();
          await updateProfileRemote(supabase, userId, profilePatch);
        });
      },
      saveAvatar: async (file) => {
        await withRemote(async (userId) => {
          const supabase = createClient();
          const path = await uploadAvatar(supabase, userId, file);
          setState((s) => ({ ...s, avatarPath: path }));
        });
      },
      pinLoved: async (item) => {
        await withRemote(async (userId) => {
          const supabase = createClient();
          await pinToLoving(supabase, userId, item);
          await refreshCommunity(userId);
        });
      },
      follow: async (targetId) => {
        await withRemote(async (userId) => {
          const supabase = createClient();
          await followUser(supabase, userId, targetId);
          await refreshCommunity(userId);
        });
      },
      unfollow: async (targetId) => {
        await withRemote(async (userId) => {
          const supabase = createClient();
          await unfollowUser(supabase, userId, targetId);
          await refreshCommunity(userId);
        });
      },
      addFriend: async (targetId) => {
        await withRemote(async () => {
          const supabase = createClient();
          await requestFriend(supabase, targetId);
          await refreshCommunity();
        });
      },
      acceptFriend: async (otherId) => {
        await withRemote(async () => {
          const supabase = createClient();
          await respondFriend(supabase, otherId, true);
          await refreshCommunity();
        });
      },
      declineFriend: async (otherId) => {
        await withRemote(async () => {
          const supabase = createClient();
          await respondFriend(supabase, otherId, false);
          await refreshCommunity();
        });
      },
      removeFriend: async (otherId) => {
        await withRemote(async () => {
          const supabase = createClient();
          await unfriend(supabase, otherId);
          await refreshCommunity();
        });
      },
      blockUser: async (otherId) => {
        await withRemote(async () => {
          const supabase = createClient();
          await blockPerson(supabase, otherId);
          await refreshCommunity();
        });
      },
      unblockUser: async (otherId) => {
        await withRemote(async () => {
          const supabase = createClient();
          await unblockPerson(supabase, otherId);
          await refreshCommunity();
        });
      },
      rotateInvite: async () => {
        let code = "";
        await withRemote(async () => {
          const supabase = createClient();
          code = await rotateInviteCode(supabase);
          setState((s) => ({ ...s, inviteCode: code }));
        });
        return code;
      },
      redeemInviteCode: async (code) => {
        const supabase = createClient();
        const inviterId = await redeemInvite(supabase, code);
        await refreshCommunity();
        return inviterId;
      },
      createList: async (input) => {
        let created: MediaList | null = null;
        await withRemote(async (userId) => {
          const supabase = createClient();
          created = await createCustomListRemote(supabase, userId, input);
          await refreshCommunity(userId);
        });
        return created;
      },
      saveList: async (listId, listPatch) => {
        await withRemote(async () => {
          const supabase = createClient();
          await updateListMeta(supabase, listId, listPatch);
          await refreshCommunity();
        });
      },
      removeList: async (listId) => {
        await withRemote(async () => {
          const supabase = createClient();
          await deleteCustomList(supabase, listId);
          await refreshCommunity();
        });
      },
      getTracked,
      track: (kind, id, status, itemName, imageUrl) => {
        let saved: TrackedRecord | null = null;
        const title = itemName || getItem(kind, id)?.name || id;
        const note = `Added ${title} to your list`;
        const tempId = crypto.randomUUID();
        patch((s) => {
          const copy = structuredClone(s);
          saved = ensure(copy, kind, id, {
            ...(status ? { myStatus: status } : {}),
            ...(itemName ? { itemName } : {}),
            ...(imageUrl ? { imageUrl } : {}),
          });
          copy.notifications.unshift({
            id: tempId,
            text: note,
            read: false,
            timestamp: new Date().toISOString(),
          });
          return copy;
        });
        void withRemote(async (userId) => {
          if (!saved) return;
          const supabase = createClient();
          await upsertTracked(supabase, userId, saved);
          const remoteNote = await insertNotification(supabase, userId, note);
          setState((s) => ({
            ...s,
            notifications: s.notifications.map((n) =>
              n.id === tempId ? remoteNote : n,
            ),
          }));
        });
      },
      untrack: (kind, id) => {
        patch((s) => {
          const copy = structuredClone(s);
          delete copy.tracked[trackKey(kind, id)];
          return copy;
        });
        void withRemote(async (userId) => {
          const supabase = createClient();
          await deleteTracked(supabase, userId, kind, id);
        });
      },
      setStatus: (kind, id, status, itemName, imageUrl) => {
        let saved: TrackedRecord | null = null;
        let diaryEntry: DiaryEntry | null = null;
        patch((s) => {
          const copy = structuredClone(s);
          saved = ensure(copy, kind, id, {
            myStatus: status,
            ...(itemName ? { itemName } : {}),
            ...(imageUrl ? { imageUrl } : {}),
          });
          const title =
            itemName ||
            saved.itemName ||
            getItem(kind, id)?.name;
          if (title && isFinishedStatus(kind, status)) {
            const already = copy.diary.some(
              (d: DiaryEntry) => d.itemId === id && d.kind === kind,
            );
            if (!already) {
              diaryEntry = {
                itemId: id,
                kind,
                name: title,
                dateFinished: new Date().toISOString(),
                personalRating: copy.tracked[trackKey(kind, id)].myRating,
              };
              copy.diary.unshift(diaryEntry);
            }
          }
          return copy;
        });
        void withRemote(async (userId) => {
          if (!saved) return;
          const supabase = createClient();
          await upsertTracked(supabase, userId, saved);
          if (diaryEntry) await upsertDiary(supabase, userId, diaryEntry);
        });
      },
      setRating: (kind, id, rating) => {
        let saved: TrackedRecord | null = null;
        patch((s) => {
          const copy = structuredClone(s);
          saved = ensure(copy, kind, id, { myRating: rating });
          return copy;
        });
        void withRemote(async (userId) => {
          if (!saved) return;
          const supabase = createClient();
          await upsertTracked(supabase, userId, saved);
        });
      },
      setReview: (kind, id, review) => {
        let saved: TrackedRecord | null = null;
        patch((s) => {
          const copy = structuredClone(s);
          saved = ensure(copy, kind, id, { myReview: review });
          return copy;
        });
        void withRemote(async (userId) => {
          if (!saved) return;
          const supabase = createClient();
          await upsertTracked(supabase, userId, saved);
        });
      },
      recommend: (input) => {
        const title =
          input.itemName ||
          state.tracked[`${input.kind}:${input.id}`]?.itemName ||
          getItem(input.kind, input.id)?.name;
        if (!title || !state.displayName) return;
        const visibility: RecVisibility =
          input.recipientIds.length > 0 &&
          input.visibility !== "public" &&
          input.visibility !== "friends"
            ? "direct"
            : input.visibility;
        const tempId = crypto.randomUUID();
        const rec: Recommendation = {
          id: tempId,
          author: state.displayName,
          authorId: user?.id ?? "local",
          authorHandle: state.handle || "you",
          authorAvatarPath: state.avatarPath,
          itemKind: input.kind,
          itemId: input.id,
          itemName: title,
          itemImageUrl: input.imageUrl,
          note: input.note,
          timestamp: new Date().toISOString(),
          visibility,
          pinned: input.pinToProfile,
          reactions: {},
          comments: [],
        };
        patch((s) => ({ ...s, recommendations: [rec, ...s.recommendations] }));
        void withRemote(async (userId) => {
          const supabase = createClient();
          const row = await insertRecommendation(supabase, userId, {
            ...input,
            itemName: title,
          });
          setState((s) => ({
            ...s,
            recommendations: s.recommendations.map((r) =>
              r.id === tempId
                ? { ...r, id: row.id, timestamp: row.created_at }
                : r,
            ),
          }));
          await refreshCommunity(userId);
        });
      },
      react: (recId, emoji) => {
        const name = state.displayName || "You";
        let currentlyOn = false;
        patch((s) => {
          const recs = s.recommendations.map((r) => {
            if (r.id !== recId) return r;
            const names = r.reactions[emoji] ?? [];
            currentlyOn = names.includes(name);
            const next = currentlyOn
              ? names.filter((n) => n !== name)
              : [...names, name];
            return {
              ...r,
              reactions: { ...r.reactions, [emoji]: next },
            };
          });
          return { ...s, recommendations: recs };
        });
        void withRemote(async (userId) => {
          const supabase = createClient();
          await toggleReaction(supabase, userId, recId, emoji, currentlyOn);
        });
      },
      comment: (recId, text) => {
        const author = state.displayName || "You";
        const timestamp = new Date().toISOString();
        patch((s) => {
          const recs = s.recommendations.map((r) => {
            if (r.id !== recId) return r;
            return {
              ...r,
              comments: [...r.comments, { author, text, timestamp }],
            };
          });
          return { ...s, recommendations: recs };
        });
        void withRemote(async (userId) => {
          const supabase = createClient();
          const createdAt = await insertComment(supabase, userId, recId, text);
          setState((s) => ({
            ...s,
            recommendations: s.recommendations.map((r) => {
              if (r.id !== recId) return r;
              return {
                ...r,
                comments: r.comments.map((c) =>
                  c.author === author && c.text === text && c.timestamp === timestamp
                    ? { ...c, timestamp: createdAt }
                    : c,
                ),
              };
            }),
          }));
        });
      },
      addFromFriend: (kind, id, friend, itemName, imageUrl) => {
        let saved: TrackedRecord | null = null;
        patch((s) => {
          const copy = structuredClone(s);
          saved = ensure(copy, kind, id, {
            myStatus: "recommended" as MyStatus,
            recommendedBy: friend,
            ...(itemName ? { itemName } : {}),
            ...(imageUrl ? { imageUrl } : {}),
          });
          return copy;
        });
        void withRemote(async (userId) => {
          if (!saved) return;
          const supabase = createClient();
          await upsertTracked(supabase, userId, saved);
        });
      },
      markAllRead: () => {
        patch((s) => ({
          ...s,
          notifications: s.notifications.map((n: AppNotification) => ({
            ...n,
            read: true,
          })),
        }));
        void withRemote(async (userId) => {
          const supabase = createClient();
          await markNotificationsRead(supabase, userId);
        });
      },
    };
  }, [state, ready, signedIn, user, social, lists, patch, withRemote, refreshCommunity]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useTracker() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTracker must be used inside TrackerProvider");
  return ctx;
}
