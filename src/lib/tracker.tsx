"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { defaultStatus, isFinishedStatus } from "./categories";
import { getCatalog, getItem, seedTrackedIds } from "./catalog";
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

function emptyState(): PersistedState {
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

function load(): PersistedState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    return { ...emptyState(), ...JSON.parse(raw) };
  } catch {
    return emptyState();
  }
}

type TrackerApi = {
  ready: boolean;
  state: PersistedState;
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
  const [state, setState] = useState<PersistedState>(emptyState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(load());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, ready]);

  const patch = useCallback((fn: (s: PersistedState) => PersistedState) => {
    setState((s) => fn(s));
  }, []);

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
    };

    return {
      ready,
      state,
      reactions: REACTIONS,
      setDisplayName: (name) => patch((s) => ({ ...s, displayName: name })),
      getTracked,
      track: (kind, id, status) =>
        patch((s) => {
          const copy = structuredClone(s);
          ensure(copy, kind, id, status ? { myStatus: status } : undefined);
          copy.notifications.unshift({
            id: crypto.randomUUID(),
            text: `Added ${getItem(kind, id)?.name ?? id} to your list`,
            read: false,
            timestamp: new Date().toISOString(),
          });
          return copy;
        }),
      untrack: (kind, id) =>
        patch((s) => {
          const copy = structuredClone(s);
          delete copy.tracked[trackKey(kind, id)];
          return copy;
        }),
      setStatus: (kind, id, status) =>
        patch((s) => {
          const copy = structuredClone(s);
          ensure(copy, kind, id, { myStatus: status });
          const item = getItem(kind, id);
          if (item && isFinishedStatus(kind, status)) {
            const already = copy.diary.some(
              (d: DiaryEntry) => d.itemId === id && d.kind === kind,
            );
            if (!already) {
              copy.diary.unshift({
                itemId: id,
                kind,
                name: item.name,
                dateFinished: new Date().toISOString(),
                personalRating: copy.tracked[trackKey(kind, id)].myRating,
              });
            }
          }
          return copy;
        }),
      setRating: (kind, id, rating) =>
        patch((s) => {
          const copy = structuredClone(s);
          ensure(copy, kind, id, { myRating: rating });
          return copy;
        }),
      setReview: (kind, id, review) =>
        patch((s) => {
          const copy = structuredClone(s);
          ensure(copy, kind, id, { myReview: review });
          return copy;
        }),
      recommend: (kind, id, note) =>
        patch((s) => {
          const item = getItem(kind, id);
          if (!item || !s.displayName) return s;
          const rec: Recommendation = {
            id: crypto.randomUUID(),
            author: s.displayName,
            itemKind: kind,
            itemId: id,
            itemName: item.name,
            note,
            timestamp: new Date().toISOString(),
            reactions: {},
            comments: [],
          };
          return { ...s, recommendations: [rec, ...s.recommendations] };
        }),
      react: (recId, emoji) =>
        patch((s) => {
          const name = s.displayName || "You";
          const recs = s.recommendations.map((r) => {
            if (r.id !== recId) return r;
            const names = r.reactions[emoji] ?? [];
            const next = names.includes(name)
              ? names.filter((n) => n !== name)
              : [...names, name];
            return {
              ...r,
              reactions: { ...r.reactions, [emoji]: next },
            };
          });
          return { ...s, recommendations: recs };
        }),
      comment: (recId, text) =>
        patch((s) => {
          const recs = s.recommendations.map((r) => {
            if (r.id !== recId) return r;
            return {
              ...r,
              comments: [
                ...r.comments,
                {
                  author: s.displayName || "You",
                  text,
                  timestamp: new Date().toISOString(),
                },
              ],
            };
          });
          return { ...s, recommendations: recs };
        }),
      addFromFriend: (kind, id, friend) =>
        patch((s) => {
          const copy = structuredClone(s);
          ensure(copy, kind, id, {
            myStatus: "recommended" as MyStatus,
            recommendedBy: friend,
          });
          return copy;
        }),
      markAllRead: () =>
        patch((s) => ({
          ...s,
          notifications: s.notifications.map((n: AppNotification) => ({
            ...n,
            read: true,
          })),
        })),
    };
  }, [state, ready, patch]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useTracker() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTracker must be used inside TrackerProvider");
  return ctx;
}
