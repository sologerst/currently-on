"use client";

import Link from "next/link";
import { friendshipOf, profileLabel } from "@/lib/community";
import type { Person } from "@/lib/community-types";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { useTracker } from "@/lib/tracker";

export function PeopleActions({ person }: { person: Person }) {
  const {
    userId,
    social,
    follow,
    unfollow,
    addFriend,
    acceptFriend,
    declineFriend,
    removeFriend,
    blockUser,
    signedIn,
  } = useTracker();
  if (!signedIn || person.id === userId) return null;

  const following = social.followingIds.includes(person.id);
  const friend = friendshipOf(social, person.id);

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className={following ? "btn-ghost !px-3 !py-1.5 text-[10px]" : "btn-primary !px-3 !py-1.5 text-[10px]"}
        onClick={() => void (following ? unfollow(person.id) : follow(person.id))}
      >
        {following ? "Following" : "Follow"}
      </button>
      {friend === "friends" ? (
        <button
          type="button"
          className="btn-ghost !px-3 !py-1.5 text-[10px]"
          onClick={() => void removeFriend(person.id)}
        >
          Friends
        </button>
      ) : friend === "pending_out" ? (
        <span className="font-display text-[10px] uppercase tracking-[0.14em] text-white/45">
          Requested
        </span>
      ) : friend === "pending_in" ? (
        <>
          <button
            type="button"
            className="btn-primary !px-3 !py-1.5 text-[10px]"
            onClick={() => void acceptFriend(person.id)}
          >
            Accept
          </button>
          <button
            type="button"
            className="btn-ghost !px-3 !py-1.5 text-[10px]"
            onClick={() => void declineFriend(person.id)}
          >
            Ignore
          </button>
        </>
      ) : (
        <button
          type="button"
          className="btn-ghost !px-3 !py-1.5 text-[10px]"
          onClick={() => void addFriend(person.id)}
        >
          Add friend
        </button>
      )}
      <button
        type="button"
        className="btn-ghost !px-3 !py-1.5 text-[10px] text-white/40"
        onClick={() => void blockUser(person.id)}
      >
        Block
      </button>
    </div>
  );
}

export function PersonRow({ person }: { person: Person }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <Link href={`/u/${person.handle}`} className="pressable shrink-0">
        <ProfileAvatar path={person.avatarPath} name={profileLabel(person)} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={`/u/${person.handle}`}
          className="block truncate font-display text-sm tracking-wide"
        >
          {profileLabel(person)}
        </Link>
        <p className="truncate font-display text-[11px] font-light text-white/45">
          @{person.handle}
        </p>
      </div>
      <PeopleActions person={person} />
    </li>
  );
}
