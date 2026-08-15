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
  const showBack = pathname !== "/";

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <header
      className="glass-bar sticky top-0 z-30 hairline"
      style={{ paddingTop: "var(--safe-top)" }}
    >
      <div className="mx-auto flex max-w-lg items-center gap-2 px-3 py-2.5">
        {showBack ? (
          <button
            type="button"
            className="pressable grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[var(--surface-2)] text-lg"
            aria-label="Back"
            onClick={() => router.back()}
          >
            ←
          </button>
        ) : (
          <Link
            href="/"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-foreground text-sm font-display text-white"
            aria-label="Currently On home"
          >
            CO
          </Link>
        )}
        <form onSubmit={onSearch} className="min-w-0 flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search everything"
            className="field"
            enterKeyHint="search"
          />
        </form>
        <div className="relative">
          <button
            type="button"
            className="pressable relative grid h-10 w-10 place-items-center rounded-2xl bg-[var(--surface-2)] text-lg"
            aria-label="Notifications"
            onClick={() => setBellOpen((v) => !v)}
          >
            ⌁
            {unread > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--tv)]" />
            )}
          </button>
          {bellOpen && (
            <div className="animate-fade absolute right-0 top-12 z-40 w-80 overflow-hidden rounded-[1.25rem] border border-[var(--hairline)] bg-surface shadow-[0_16px_40px_rgba(18,20,26,0.12)]">
              <div className="flex items-center justify-between border-b border-[var(--hairline)] px-3 py-2.5">
                <p className="font-display text-sm">Notifications</p>
                <button
                  type="button"
                  className="text-xs text-muted"
                  onClick={markAllRead}
                >
                  Mark all read
                </button>
              </div>
              <ul className="max-h-64 space-y-1 overflow-auto p-2">
                {state.notifications.length === 0 && (
                  <li className="px-2 py-3 text-sm text-muted">All quiet.</li>
                )}
                {state.notifications.map((n) => (
                  <li
                    key={n.id}
                    className={`rounded-xl px-3 py-2.5 text-sm ${
                      n.read ? "text-muted" : "bg-[var(--surface-2)]"
                    }`}
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
