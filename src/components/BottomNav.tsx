"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Home", match: (p: string) => p === "/", icon: "⌂" },
  {
    href: "/diary",
    label: "Profile",
    match: (p: string) => p.startsWith("/diary") || p.startsWith("/u/"),
    icon: "◉",
  },
  {
    href: "/calendar",
    label: "Calendar",
    match: (p: string) => p.startsWith("/calendar"),
    icon: "▦",
  },
  {
    href: "/friends",
    label: "Friends",
    match: (p: string) => p.startsWith("/friends") || p.startsWith("/join"),
    icon: "◎",
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="glass-bar fixed inset-x-0 bottom-0 z-40 border-t border-white/10"
      style={{ paddingBottom: "var(--safe-bottom)" }}
      aria-label="Primary"
    >
      <div className="mx-auto grid h-[4.25rem] max-w-lg grid-cols-4 px-2">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`pressable flex flex-col items-center justify-center gap-0.5 font-display text-[10px] font-light uppercase tracking-[0.16em] ${
                active ? "text-white" : "text-white/40"
              }`}
            >
              <span
                className={`grid h-8 w-12 place-items-center rounded-2xl text-base ${
                  active ? "bg-white/10" : ""
                }`}
                aria-hidden
              >
                {tab.icon}
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
