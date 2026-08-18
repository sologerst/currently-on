"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AlwaysOnLogo } from "@/components/AlwaysOnLogo";
import { useTracker } from "@/lib/tracker";

const MENU = [
  { href: "/", label: "What's Hot" },
  { href: "/movies", label: "Movies" },
  { href: "/tv", label: "Shows" },
  { href: "/music", label: "Music" },
  { href: "/podcasts", label: "Podcasts" },
  { href: "/books", label: "Books" },
  { href: "/friends", label: "Friends" },
  { href: "/diary", label: "Profile" },
  { href: "/calendar", label: "Calendar" },
];

export function TopBar({ splash = false }: { splash?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state, markAllRead } = useTracker();
  const [q, setQ] = useState("");
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const unread = state.notifications.filter((n) => !n.read).length;
  const showBack = pathname !== "/" && !splash;
  const open = menuFor === pathname;

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    setMenuFor(null);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <header
      className="sticky top-0 z-30"
      style={{ paddingTop: "var(--safe-top)" }}
    >
      <div className="relative mx-auto flex max-w-lg items-center px-4 py-2.5">
        <div className="flex w-10 shrink-0 justify-start">
          {showBack ? (
            <button
              type="button"
              className="pressable grid h-10 w-10 place-items-center text-lg text-white"
              aria-label="Back"
              onClick={() => router.back()}
            >
              ←
            </button>
          ) : (
            <span className="w-10" />
          )}
        </div>
        <div className="flex min-w-0 flex-1 justify-center">
          <Link href="/" aria-label="Always On home">
            <AlwaysOnLogo size="sm" glow={splash} />
          </Link>
        </div>
        <div className="flex w-10 shrink-0 justify-end">
          {!splash && (
            <button
              type="button"
              className="pressable relative grid h-10 w-10 place-items-center"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setMenuFor(open ? null : pathname)}
            >
              <span className="flex flex-col items-center gap-[5px]" aria-hidden>
                <span className="block h-px w-5 bg-white" />
                <span className="block h-px w-5 bg-white" />
                <span className="block h-px w-5 bg-white" />
              </span>
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--gold)]" />
              )}
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="animate-fade absolute inset-x-0 top-full z-40">
          <div className="mx-auto max-w-lg border-t border-white/15 bg-black/72 px-4 py-4 backdrop-blur-xl">
            <form onSubmit={onSearch}>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search everything"
                className="field"
                enterKeyHint="search"
              />
            </form>
            <nav className="mt-4 grid gap-1">
              {MENU.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`pressable rounded-xl px-2 py-2.5 font-display text-sm font-light uppercase tracking-[0.18em] ${
                    pathname === item.href ? "text-white" : "text-white/55"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-4 border-t border-white/15 pt-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-display text-[11px] font-light uppercase tracking-[0.2em] text-white/70">
                  Notifications
                </p>
                <button
                  type="button"
                  className="font-display text-[10px] uppercase tracking-[0.16em] text-muted"
                  onClick={markAllRead}
                >
                  Mark all read
                </button>
              </div>
              <ul className="max-h-40 space-y-1 overflow-auto">
                {state.notifications.length === 0 && (
                  <li className="py-2 text-sm text-muted">All quiet.</li>
                )}
                {state.notifications.map((n) => (
                  <li
                    key={n.id}
                    className={`rounded-lg px-2 py-2 text-sm ${
                      n.read ? "text-muted" : "bg-white/5 text-white"
                    }`}
                  >
                    {n.text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
