"use client";

import { ProfileScreen } from "@/components/ProfileScreen";
import { SectionRule } from "@/components/SectionRule";
import { CATEGORY_META } from "@/lib/categories";
import { useTracker } from "@/lib/tracker";
import Link from "next/link";

export function DiaryScreen() {
  const { state, signedIn } = useTracker();
  const year = new Date().getFullYear();

  return (
    <>
      <ProfileScreen isOwn />
      <div className="mx-auto max-w-lg px-4 pb-8">
        <SectionRule>Diary {year}</SectionRule>
        {!signedIn && (
          <p className="mt-3 text-sm text-muted">
            Sign in on Friends to publish a public profile.
          </p>
        )}
        <ul className="mt-3 divide-y divide-white/10">
          {state.diary.length === 0 && (
            <li className="py-4 text-sm text-muted">
              Finish something to start the log.
            </li>
          )}
          {state.diary.map((d) => (
            <li key={`${d.kind}-${d.itemId}-${d.dateFinished}`}>
              <Link
                href={`/${d.kind}/${d.itemId}`}
                className="pressable block py-3.5"
              >
                <p className="font-display text-[10px] font-light uppercase tracking-wide text-muted">
                  {new Date(d.dateFinished).toLocaleDateString()}
                </p>
                <p className="font-display text-lg leading-tight tracking-wide">
                  {d.name}
                </p>
                <p className="mt-0.5 font-display text-xs font-light text-muted">
                  {CATEGORY_META[d.kind].label}
                  {d.personalRating ? ` · ${d.personalRating}★` : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
