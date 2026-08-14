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
import { createClient, isSupabaseConfigured } from "./supabase/client";
import {
  deleteTracked,
  insertComment,
  insertNotification,
  insertRecommendation,
  loadRemoteState,
  markNotificationsRead,
  toggleReaction,
  updateDisplayName,
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
    tracked,
    recommendations: [
      {
        id: "rec-demo-1",
        author: "Sam",
        itemKind: "tv",
        itemId: "tv-4",
        itemName: "County Line",
        note: "Start with season 2 — it clicks.",
        timestamp: now,
        reactions: { "🔥": ["Sam"] },
        comments: [],
      },
      {
        id: "rec-demo-2",
        author: "Jules",
        itemKind: "books",
        itemId: "bk-3",
        itemName: "Signal Loss",
        note: "One sitting. Trust me.",
        timestamp: now,
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
    tracked: {},
    recommendations: [],
    diary: [],
    notifications: [],
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
  userEmail: string | null;
  state: PersistedState;
  signOut: () => Promise<void>;
  setDisplayName: (name: string) => void;
  track: (kind: CategoryKind, id: string, status?: MyStatus) => void;
  untrack: (kind: CategoryKind, id: string) => void;
  getTracked: (kind: CategoryKind, id: string) => TrackedRecord | undefined;
  setStatus: (kind: CategoryKind, id: string, status: MyStatus) => void;
  setRating: (kind: CategoryKind, id: string, rating: number) => void;
  setReview: (kind: CategoryKind, id: string, review: string) => void;
  recommend: (kind: CategoryKind, id: string, note: string) => void;
  react: (recId: string, emoji: string) => void;
  comment: (recId: string, text: string) => void;
  addFromFriend: (kind: CategoryKind, id: string, friend: string) => void;
  markAllRead: () => void;
  reactions: string[];
};

const Ctx = createContext<TrackerApi | null>(null);

export function TrackerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(emptyGuestState);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const userIdRef = useRef<string | null>(null);
  const signedIn = Boolean(user);

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
        } catch (err) {
          console.error("Failed to load remote tracker state", err);
          if (!cancelled) setState(emptyAccountState());
        }
      } else {
        setUser(null);
        setState(loadGuest());
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
        } catch (err) {
          console.error("Failed to refresh remote tracker state", err);
          setState(emptyAccountState());
        }
      } else {
        setState(loadGuest());
      }
      setReady(true);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!ready || signedIn) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, ready, signedIn]);

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
      userEmail: user?.email ?? null,
      state,
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
          await updateDisplayName(supabase, userId, name);
        });
      },
      getTracked,
      track: (kind, id, status) => {
        let saved: TrackedRecord | null = null;
        const note = `Added ${getItem(kind, id)?.name ?? id} to your list`;
        const tempId = crypto.randomUUID();
        patch((s) => {
          const copy = structuredClone(s);
          saved = ensure(
            copy,
            kind,
            id,
            status ? { myStatus: status } : undefined,
          );
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
      setStatus: (kind, id, status) => {
        let saved: TrackedRecord | null = null;
        let diaryEntry: DiaryEntry | null = null;
        patch((s) => {
          const copy = structuredClone(s);
          saved = ensure(copy, kind, id, { myStatus: status });
          const item = getItem(kind, id);
          if (item && isFinishedStatus(kind, status)) {
            const already = copy.diary.some(
              (d: DiaryEntry) => d.itemId === id && d.kind === kind,
            );
            if (!already) {
              diaryEntry = {
                itemId: id,
                kind,
                name: item.name,
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
      recommend: (kind, id, note) => {
        const item = getItem(kind, id);
        if (!item || !state.displayName) return;
        const tempId = crypto.randomUUID();
        const rec: Recommendation = {
          id: tempId,
          author: state.displayName,
          itemKind: kind,
          itemId: id,
          itemName: item.name,
          note,
          timestamp: new Date().toISOString(),
          reactions: {},
          comments: [],
        };
        patch((s) => ({ ...s, recommendations: [rec, ...s.recommendations] }));
        void withRemote(async (userId) => {
          const supabase = createClient();
          const row = await insertRecommendation(supabase, userId, {
            kind,
            itemId: id,
            itemName: item.name,
            note,
          });
          setState((s) => ({
            ...s,
            recommendations: s.recommendations.map((r) =>
              r.id === tempId
                ? { ...r, id: row.id, timestamp: row.created_at }
                : r,
            ),
          }));
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
      addFromFriend: (kind, id, friend) => {
        let saved: TrackedRecord | null = null;
        patch((s) => {
          const copy = structuredClone(s);
          saved = ensure(copy, kind, id, {
            myStatus: "recommended" as MyStatus,
            recommendedBy: friend,
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
  }, [state, ready, signedIn, user, patch, withRemote]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useTracker() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTracker must be used inside TrackerProvider");
  return ctx;
}
