"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useTracker } from "@/lib/tracker";

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { state, markAllRead } = useTracker();
  const [q, setQ] = useState("");
  const [bellOpen, setBellOpen] = useState(false);
  const unread = state.notifications.filter((n) => !n.read).length;

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-black/8 bg-white">
      <div className="mx-auto flex max-w-lg items-center gap-2 px-3 py-2">
        {pathname !== "/" ? (
          <Link
            href="/"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg"
            aria-label="Home"
          >
            ←
          </Link>
        ) : (
          <div className="w-1" />
        )}
        <form onSubmit={onSearch} className="min-w-0 flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search catalogs"
            className="w-full rounded-xl border border-black/10 bg-[#F6F7F9] px-3 py-2 text-sm outline-none focus:border-black/25"
          />
        </form>
        <Link
          href="/diary"
          className="grid h-10 w-10 place-items-center rounded-xl text-lg"
          aria-label="Diary"
        >
          ⌘
        </Link>
        <Link
          href="/calendar"
          className="grid h-10 w-10 place-items-center rounded-xl text-lg"
          aria-label="Calendar"
        >
          ▦
        </Link>
        <div className="relative">
          <button
            type="button"
            className="relative grid h-10 w-10 place-items-center rounded-xl text-lg"
            aria-label="Notifications"
            onClick={() => setBellOpen((v) => !v)}
          >
            ⌁
            {unread > 0 && (
              <span className="absolute right-1 top-1 min-w-4 rounded-full bg-[#E5473F] px-1 text-center font-mono text-[10px] text-white">
                {unread}
              </span>
            )}
          </button>
          {bellOpen && (
            <div className="absolute right-0 top-12 z-40 w-72 rounded-2xl border border-black/10 bg-white p-3 shadow-lg">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-display text-sm">Notifications</p>
                <button
                  type="button"
                  className="text-xs text-black/50"
                  onClick={markAllRead}
                >
                  Mark all read
                </button>
              </div>
              <ul className="max-h-64 space-y-2 overflow-auto">
                {state.notifications.length === 0 && (
                  <li className="text-sm text-black/50">All quiet.</li>
                )}
                {state.notifications.map((n) => (
                  <li
                    key={n.id}
                    className={`rounded-xl px-2 py-2 text-sm ${n.read ? "text-black/45" : "bg-[#F6F7F9]"}`}
                  >
                    {n.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
