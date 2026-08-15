import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type {
  AppNotification,
  CategoryKind,
  DiaryEntry,
  MyStatus,
  PersistedState,
  Recommendation,
  TrackedRecord,
} from "@/lib/types";

type Client = SupabaseClient<Database>;

function trackKey(kind: CategoryKind, id: string) {
  return `${kind}:${id}`;
}

type RecRow = {
  id: string;
  item_kind: string;
  item_id: string;
  item_name: string;
  note: string;
  created_at: string;
  profiles: { display_name: string } | null;
  recommendation_reactions: Array<{
    emoji: string;
    profiles: { display_name: string } | null;
  }> | null;
  recommendation_comments: Array<{
    text: string;
    created_at: string;
    profiles: { display_name: string } | null;
  }> | null;
};

const RECOMMENDATION_SELECT = `
  id,
  item_kind,
  item_id,
  item_name,
  note,
  created_at,
  profiles!recommendations_author_id_fkey ( display_name ),
  recommendation_reactions (
    emoji,
    profiles!recommendation_reactions_user_id_fkey ( display_name )
  ),
  recommendation_comments (
    text,
    created_at,
    profiles!recommendation_comments_user_id_fkey ( display_name )
  )
`;

function mapRecommendationRows(rows: RecRow[]): Recommendation[] {
  return rows.map((row) => {
    const reactions: Record<string, string[]> = {};
    for (const r of row.recommendation_reactions ?? []) {
      const name = r.profiles?.display_name || "Someone";
      reactions[r.emoji] = [...(reactions[r.emoji] ?? []), name];
    }
    return {
      id: row.id,
      author: row.profiles?.display_name || "Someone",
      itemKind: row.item_kind as CategoryKind,
      itemId: row.item_id,
      itemName: row.item_name,
      note: row.note,
      timestamp: row.created_at,
      reactions,
      comments: (row.recommendation_comments ?? []).map((c) => ({
        author: c.profiles?.display_name || "Someone",
        text: c.text,
        timestamp: c.created_at,
      })),
    };
  });
}

/** Shared Friends feed query — also used to refresh after Realtime events. */
export async function loadRecommendations(
  supabase: Client,
): Promise<Recommendation[]> {
  const { data, error } = await supabase
    .from("recommendations")
    .select(RECOMMENDATION_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return mapRecommendationRows((data ?? []) as unknown as RecRow[]);
}

export async function loadRemoteState(
  supabase: Client,
  userId: string,
): Promise<PersistedState> {
  const [profileRes, trackedRes, diaryRes, notificationsRes, recommendations] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name")
        .eq("id", userId)
        .maybeSingle(),
      supabase.from("tracked_items").select("*").eq("user_id", userId),
      supabase
        .from("diary_entries")
        .select("*")
        .eq("user_id", userId)
        .order("date_finished", { ascending: false }),
      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      loadRecommendations(supabase),
    ]);

  if (profileRes.error) throw profileRes.error;
  if (trackedRes.error) throw trackedRes.error;
  if (diaryRes.error) throw diaryRes.error;
  if (notificationsRes.error) throw notificationsRes.error;

  const tracked: Record<string, TrackedRecord> = {};
  for (const row of trackedRes.data ?? []) {
    tracked[trackKey(row.kind as CategoryKind, row.item_id)] = {
      itemId: row.item_id,
      kind: row.kind as CategoryKind,
      myStatus: row.my_status as MyStatus,
      myRating: row.my_rating,
      myReview: row.my_review,
      recommendedBy: row.recommended_by ?? undefined,
    };
  }

  const diary: DiaryEntry[] = (diaryRes.data ?? []).map((row) => ({
    itemId: row.item_id,
    kind: row.kind as CategoryKind,
    name: row.name,
    dateFinished: row.date_finished,
    personalRating: row.personal_rating,
  }));

  const notifications: AppNotification[] = (notificationsRes.data ?? []).map(
    (row) => ({
      id: row.id,
      text: row.text,
      read: row.read,
      timestamp: row.created_at,
    }),
  );

  return {
    displayName: profileRes.data?.display_name ?? "",
    tracked,
    diary,
    notifications,
    recommendations,
  };
}

export async function upsertTracked(
  supabase: Client,
  userId: string,
  record: TrackedRecord,
) {
  const { error } = await supabase.from("tracked_items").upsert(
    {
      user_id: userId,
      item_id: record.itemId,
      kind: record.kind,
      my_status: record.myStatus,
      my_rating: record.myRating,
      my_review: record.myReview,
      recommended_by: record.recommendedBy ?? null,
    },
    { onConflict: "user_id,kind,item_id" },
  );
  if (error) throw error;
}

export async function deleteTracked(
  supabase: Client,
  userId: string,
  kind: CategoryKind,
  itemId: string,
) {
  const { error } = await supabase
    .from("tracked_items")
    .delete()
    .eq("user_id", userId)
    .eq("kind", kind)
    .eq("item_id", itemId);
  if (error) throw error;
}

export async function upsertDiary(
  supabase: Client,
  userId: string,
  entry: DiaryEntry,
) {
  const { error } = await supabase.from("diary_entries").upsert(
    {
      user_id: userId,
      item_id: entry.itemId,
      kind: entry.kind,
      name: entry.name,
      date_finished: entry.dateFinished,
      personal_rating: entry.personalRating,
    },
    { onConflict: "user_id,kind,item_id" },
  );
  if (error) throw error;
}

export async function insertNotification(
  supabase: Client,
  userId: string,
  text: string,
) {
  const { data, error } = await supabase
    .from("notifications")
    .insert({ user_id: userId, text })
    .select("id, text, read, created_at")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    text: data.text,
    read: data.read,
    timestamp: data.created_at,
  } satisfies AppNotification;
}

export async function markNotificationsRead(
  supabase: Client,
  userId: string,
) {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);
  if (error) throw error;
}

export async function updateDisplayName(
  supabase: Client,
  userId: string,
  displayName: string,
) {
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: userId, display_name: displayName });
  if (error) throw error;
}

export async function insertRecommendation(
  supabase: Client,
  userId: string,
  input: {
    kind: CategoryKind;
    itemId: string;
    itemName: string;
    note: string;
  },
) {
  const { data, error } = await supabase
    .from("recommendations")
    .insert({
      author_id: userId,
      item_kind: input.kind,
      item_id: input.itemId,
      item_name: input.itemName,
      note: input.note,
    })
    .select("id, created_at")
    .single();
  if (error) throw error;
  return data;
}

export async function toggleReaction(
  supabase: Client,
  userId: string,
  recommendationId: string,
  emoji: string,
  currentlyOn: boolean,
) {
  if (currentlyOn) {
    const { error } = await supabase
      .from("recommendation_reactions")
      .delete()
      .eq("recommendation_id", recommendationId)
      .eq("user_id", userId)
      .eq("emoji", emoji);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("recommendation_reactions").insert({
    recommendation_id: recommendationId,
    user_id: userId,
    emoji,
  });
  if (error) throw error;
}

export async function insertComment(
  supabase: Client,
  userId: string,
  recommendationId: string,
  text: string,
) {
  const { data, error } = await supabase
    .from("recommendation_comments")
    .insert({
      recommendation_id: recommendationId,
      user_id: userId,
      text,
    })
    .select("created_at")
    .single();
  if (error) throw error;
  return data.created_at;
}
