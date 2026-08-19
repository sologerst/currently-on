import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { mapPerson, slugFromTitle } from "@/lib/community";
import type {
  ListKind,
  ListVisibility,
  MediaList,
  MediaListItem,
  OwnProfile,
  Person,
  ProfileVisibility,
  RecommendInput,
  SocialGraph,
} from "@/lib/community-types";
import type {
  AppNotification,
  CategoryKind,
  Comment,
  DiaryEntry,
  MyStatus,
  PersistedState,
  Recommendation,
  RecVisibility,
  TrackedRecord,
} from "@/lib/types";

type Client = SupabaseClient<Database>;

function trackKey(kind: CategoryKind, id: string) {
  return `${kind}:${id}`;
}

type RecRow = {
  id: string;
  author_id: string;
  item_kind: string;
  item_id: string;
  item_name: string;
  item_image_url: string | null;
  note: string;
  visibility: string;
  pinned: boolean;
  created_at: string;
  profiles: {
    display_name: string;
    handle: string | null;
    avatar_path: string | null;
  } | null;
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
  author_id,
  item_kind,
  item_id,
  item_name,
  item_image_url,
  note,
  visibility,
  pinned,
  created_at,
  profiles!recommendations_author_id_fkey ( display_name, handle, avatar_path ),
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
      author: row.profiles?.display_name || row.profiles?.handle || "Someone",
      authorId: row.author_id,
      authorHandle: row.profiles?.handle || "user",
      authorAvatarPath: row.profiles?.avatar_path,
      itemKind: row.item_kind as CategoryKind,
      itemId: row.item_id,
      itemName: row.item_name,
      itemImageUrl: row.item_image_url ?? undefined,
      note: row.note,
      timestamp: row.created_at,
      visibility: (row.visibility as RecVisibility) || "friends",
      pinned: row.pinned,
      reactions,
      comments: (row.recommendation_comments ?? []).map(
        (c): Comment => ({
          author: c.profiles?.display_name || "Someone",
          text: c.text,
          timestamp: c.created_at,
        }),
      ),
    };
  });
}

async function loadRecommendationsByIds(
  supabase: Client,
  ids: string[],
): Promise<Recommendation[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("recommendations")
    .select(RECOMMENDATION_SELECT)
    .in("id", ids)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return mapRecommendationRows((data ?? []) as unknown as RecRow[]);
}

export async function loadRecommendations(
  supabase: Client,
): Promise<Recommendation[]> {
  const { data: feed, error: feedError } = await supabase.rpc("my_feed_ids");
  if (feedError) throw feedError;
  const ids = (feed ?? []).map((row) => row.id);
  return loadRecommendationsByIds(supabase, ids);
}

export async function loadPublicRecommendations(
  supabase: Client,
  authorId: string,
): Promise<Recommendation[]> {
  const { data, error } = await supabase
    .from("recommendations")
    .select(RECOMMENDATION_SELECT)
    .eq("author_id", authorId)
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) throw error;
  return mapRecommendationRows((data ?? []) as unknown as RecRow[]);
}

function mapList(
  list: Database["public"]["Tables"]["lists"]["Row"],
  items: Database["public"]["Tables"]["list_items"]["Row"][],
): MediaList {
  return {
    id: list.id,
    ownerId: list.owner_id,
    title: list.title,
    description: list.description,
    slug: list.slug,
    kind: list.kind as ListKind,
    visibility: list.visibility as ListVisibility,
    items: items
      .slice()
      .sort((a, b) => a.position - b.position)
      .map(
        (item): MediaListItem => ({
          id: item.id,
          itemKind: item.item_kind as CategoryKind,
          itemId: item.item_id,
          itemName: item.item_name,
          imageUrl: item.image_url ?? undefined,
          note: item.note,
          position: item.position,
        }),
      ),
  };
}

export async function loadLists(
  supabase: Client,
  ownerId: string,
): Promise<MediaList[]> {
  const { data: lists, error } = await supabase
    .from("lists")
    .select("*")
    .eq("owner_id", ownerId)
    .order("kind", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (!lists?.length) return [];
  const { data: items, error: itemsError } = await supabase
    .from("list_items")
    .select("*")
    .in(
      "list_id",
      lists.map((l) => l.id),
    );
  if (itemsError) throw itemsError;
  const byList = new Map<string, Database["public"]["Tables"]["list_items"]["Row"][]>();
  for (const item of items ?? []) {
    const bucket = byList.get(item.list_id) ?? [];
    bucket.push(item);
    byList.set(item.list_id, bucket);
  }
  return lists.map((list) => mapList(list, byList.get(list.id) ?? []));
}

export async function loadListBySlug(
  supabase: Client,
  ownerId: string,
  slug: string,
): Promise<MediaList | null> {
  const { data: list, error } = await supabase
    .from("lists")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!list) return null;
  const { data: items, error: itemsError } = await supabase
    .from("list_items")
    .select("*")
    .eq("list_id", list.id)
    .order("position", { ascending: true });
  if (itemsError) throw itemsError;
  return mapList(list, items ?? []);
}

export async function loadProfileByHandle(
  supabase: Client,
  handle: string,
): Promise<Person | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, handle, display_name, bio, avatar_path, visibility")
    .eq("handle", handle.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapPerson(data);
}

export async function loadProfileByInvite(
  supabase: Client,
  code: string,
): Promise<Person | null> {
  const { data, error } = await supabase.rpc("lookup_invite", { code: code.toLowerCase() });
  if (error) throw error;
  const row = data?.[0];
  if (!row) return null;
  return mapPerson(row);
}

export async function loadSocialGraph(
  supabase: Client,
  userId: string,
): Promise<SocialGraph> {
  const [followingRes, followersRes, friendsRes] = await Promise.all([
    supabase.from("follows").select("following_id").eq("follower_id", userId),
    supabase.from("follows").select("follower_id").eq("following_id", userId),
    supabase
      .from("friendships")
      .select("id, requester_id, addressee_id, status")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
  ]);
  if (followingRes.error) throw followingRes.error;
  if (followersRes.error) throw followersRes.error;
  if (friendsRes.error) throw friendsRes.error;

  const followingIds = (followingRes.data ?? []).map((r) => r.following_id);
  const followerIds = (followersRes.data ?? []).map((r) => r.follower_id);
  const friendIds: string[] = [];
  const incomingRequestIds: string[] = [];
  const outgoingRequestIds: string[] = [];

  for (const row of friendsRes.data ?? []) {
    const other = row.requester_id === userId ? row.addressee_id : row.requester_id;
    if (row.status === "accepted") friendIds.push(other);
    else if (row.status === "pending" && row.addressee_id === userId) {
      incomingRequestIds.push(row.requester_id);
    } else if (row.status === "pending" && row.requester_id === userId) {
      outgoingRequestIds.push(row.addressee_id);
    }
  }

  const ids = [
    ...new Set([
      ...followingIds,
      ...followerIds,
      ...friendIds,
      ...incomingRequestIds,
      ...outgoingRequestIds,
    ]),
  ];
  const people: Record<string, Person> = {};
  if (ids.length > 0) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, handle, display_name, bio, avatar_path, visibility")
      .in("id", ids);
    if (error) throw error;
    for (const row of data ?? []) people[row.id] = mapPerson(row);
  }

  return {
    followingIds,
    followerIds,
    friendIds,
    incomingRequestIds,
    outgoingRequestIds,
    people,
  };
}

export async function searchPeople(
  supabase: Client,
  query: string,
): Promise<Person[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const { data, error } = await supabase.rpc("search_people", { q: trimmed });
  if (error) throw error;
  return (data ?? []).map((row) =>
    mapPerson({
      id: row.id,
      handle: row.handle,
      display_name: row.display_name,
      bio: row.bio,
      avatar_path: row.avatar_path,
      visibility: row.visibility,
    }),
  );
}

export async function findPersonByEmail(
  supabase: Client,
  email: string,
): Promise<Person | null> {
  const { data, error } = await supabase.rpc("find_profile_by_email", {
    p_email: email.trim(),
  });
  if (error) throw error;
  const row = data?.[0];
  if (!row) return null;
  return mapPerson({
    id: row.id,
    handle: row.handle,
    display_name: row.display_name,
    bio: row.bio,
    avatar_path: row.avatar_path,
    visibility: row.visibility,
  });
}

export async function followUser(supabase: Client, userId: string, targetId: string) {
  const { error } = await supabase.from("follows").insert({
    follower_id: userId,
    following_id: targetId,
  });
  if (error && error.code !== "23505") throw error;
}

export async function unfollowUser(
  supabase: Client,
  userId: string,
  targetId: string,
) {
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", userId)
    .eq("following_id", targetId);
  if (error) throw error;
}

export async function requestFriend(supabase: Client, targetId: string) {
  const { error } = await supabase.rpc("request_friend", { target_id: targetId });
  if (error) throw error;
}

export async function respondFriend(
  supabase: Client,
  otherId: string,
  accept: boolean,
) {
  const { error } = await supabase.rpc("respond_friend", {
    other_id: otherId,
    accept,
  });
  if (error) throw error;
}

export async function unfriend(supabase: Client, otherId: string) {
  const { error } = await supabase.rpc("unfriend", { other_id: otherId });
  if (error) throw error;
}

export async function redeemInvite(supabase: Client, code: string): Promise<string> {
  const { data, error } = await supabase.rpc("redeem_invite", { code });
  if (error) throw error;
  return data;
}

export async function updateProfile(
  supabase: Client,
  userId: string,
  patch: {
    displayName?: string;
    handle?: string;
    bio?: string;
    visibility?: ProfileVisibility;
    avatarPath?: string | null;
  },
) {
  const row: Database["public"]["Tables"]["profiles"]["Update"] = {};
  if (patch.displayName !== undefined) row.display_name = patch.displayName;
  if (patch.handle !== undefined) row.handle = patch.handle;
  if (patch.bio !== undefined) row.bio = patch.bio;
  if (patch.visibility !== undefined) row.visibility = patch.visibility;
  if (patch.avatarPath !== undefined) row.avatar_path = patch.avatarPath;
  const { error } = await supabase.from("profiles").update(row).eq("id", userId);
  if (error) throw error;
}

export async function uploadAvatar(
  supabase: Client,
  userId: string,
  file: File,
): Promise<string> {
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/avatar.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, {
    upsert: true,
    contentType: file.type || "image/jpeg",
  });
  if (error) throw error;
  await updateProfile(supabase, userId, { avatarPath: path });
  return path;
}

export async function createCustomList(
  supabase: Client,
  userId: string,
  input: { title: string; description: string; visibility: ListVisibility },
): Promise<MediaList> {
  const slug = slugFromTitle(input.title);
  for (let n = 0; n < 8; n += 1) {
    const candidate = n === 0 ? slug : `${slug}-${n + 1}`;
    const { data, error } = await supabase
      .from("lists")
      .insert({
        owner_id: userId,
        title: input.title.trim(),
        description: input.description.trim(),
        slug: candidate,
        kind: "custom",
        visibility: input.visibility,
      })
      .select("*")
      .single();
    if (!error && data) return mapList(data, []);
    if (error?.code !== "23505") throw error;
  }
  throw new Error("Could not create list");
}

export async function updateListMeta(
  supabase: Client,
  listId: string,
  patch: { title?: string; description?: string; visibility?: ListVisibility },
) {
  const { error } = await supabase
    .from("lists")
    .update({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.visibility !== undefined ? { visibility: patch.visibility } : {}),
    })
    .eq("id", listId);
  if (error) throw error;
}

export async function deleteCustomList(supabase: Client, listId: string) {
  const { error } = await supabase.from("lists").delete().eq("id", listId);
  if (error) throw error;
}

export async function addListItem(
  supabase: Client,
  listId: string,
  item: {
    kind: CategoryKind;
    id: string;
    name: string;
    imageUrl?: string;
    note?: string;
  },
) {
  const { error } = await supabase.from("list_items").upsert(
    {
      list_id: listId,
      item_kind: item.kind,
      item_id: item.id,
      item_name: item.name,
      image_url: item.imageUrl ?? null,
      note: item.note ?? "",
    },
    { onConflict: "list_id,item_kind,item_id" },
  );
  if (error) throw error;
}

export async function removeListItem(
  supabase: Client,
  listId: string,
  kind: CategoryKind,
  itemId: string,
) {
  const { error } = await supabase
    .from("list_items")
    .delete()
    .eq("list_id", listId)
    .eq("item_kind", kind)
    .eq("item_id", itemId);
  if (error) throw error;
}

export async function pinToLoving(
  supabase: Client,
  userId: string,
  item: {
    kind: CategoryKind;
    id: string;
    name: string;
    imageUrl?: string;
    note: string;
  },
) {
  const { data: list, error } = await supabase
    .from("lists")
    .select("id")
    .eq("owner_id", userId)
    .eq("slug", "loving")
    .maybeSingle();
  if (error) throw error;
  let listId = list?.id;
  if (!listId) {
    await supabase.rpc("ensure_standard_lists", { p_user_id: userId });
    const { data: created, error: createdError } = await supabase
      .from("lists")
      .select("id")
      .eq("owner_id", userId)
      .eq("slug", "loving")
      .single();
    if (createdError) throw createdError;
    listId = created.id;
  }
  await addListItem(supabase, listId, item);
}

export async function loadRemoteState(
  supabase: Client,
  userId: string,
): Promise<PersistedState> {
  const [profileRes, trackedRes, diaryRes, notificationsRes, recommendations] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
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

  let profile = profileRes.data;
  if (profile && !profile.handle) {
    const desired =
      profile.display_name ||
      `user`;
    const { data: handle } = await supabase.rpc("unique_handle", { desired });
    if (handle) {
      await supabase.from("profiles").update({ handle }).eq("id", userId);
      profile = { ...profile, handle };
    }
    await supabase.rpc("ensure_standard_lists", { p_user_id: userId });
  }

  const tracked: Record<string, TrackedRecord> = {};
  for (const row of trackedRes.data ?? []) {
    tracked[trackKey(row.kind as CategoryKind, row.item_id)] = {
      itemId: row.item_id,
      kind: row.kind as CategoryKind,
      myStatus: row.my_status as MyStatus,
      myRating: row.my_rating,
      myReview: row.my_review,
      recommendedBy: row.recommended_by ?? undefined,
      itemName: row.item_name || undefined,
      imageUrl: row.image_url ?? undefined,
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
      link: row.link ?? undefined,
    }),
  );

  return {
    displayName: profile?.display_name ?? "",
    handle: profile?.handle ?? "",
    bio: profile?.bio ?? "",
    avatarPath: profile?.avatar_path ?? null,
    visibility: (profile?.visibility as OwnProfile["visibility"]) || "public",
    inviteCode: profile?.invite_code ?? "",
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
      item_name: record.itemName ?? "",
      image_url: record.imageUrl ?? null,
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
    .select("id, text, read, created_at, link")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    text: data.text,
    read: data.read,
    timestamp: data.created_at,
    link: data.link ?? undefined,
  } satisfies AppNotification;
}

export async function markNotificationsRead(supabase: Client, userId: string) {
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
  await updateProfile(supabase, userId, { displayName });
}

export async function insertRecommendation(
  supabase: Client,
  userId: string,
  input: RecommendInput,
) {
  const visibility: RecVisibility =
    input.recipientIds.length > 0 &&
    input.visibility !== "public" &&
    input.visibility !== "friends"
      ? "direct"
      : input.visibility;

  const { data, error } = await supabase
    .from("recommendations")
    .insert({
      author_id: userId,
      item_kind: input.kind,
      item_id: input.id,
      item_name: input.itemName,
      item_image_url: input.imageUrl ?? null,
      note: input.note,
      visibility,
      pinned: input.pinToProfile,
    })
    .select("id, created_at")
    .single();
  if (error) throw error;

  if (input.recipientIds.length > 0) {
    const { error: recError } = await supabase
      .from("recommendation_recipients")
      .insert(
        input.recipientIds.map((id) => ({
          recommendation_id: data.id,
          user_id: id,
        })),
      );
    if (recError) throw recError;
  }

  if (input.pinToProfile) {
    await pinToLoving(supabase, userId, {
      kind: input.kind,
      id: input.id,
      name: input.itemName,
      imageUrl: input.imageUrl,
      note: input.note,
    });
  }

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
