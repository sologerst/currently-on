"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { InstallBanner } from "@/components/InstallBanner";
import { OnDeckTicker } from "@/components/OnDeckTicker";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { TopBar } from "@/components/TopBar";
import { TrackerProvider, useTracker } from "@/lib/tracker";

function sceneFromPath(pathname: string) {
  if (pathname.startsWith("/music")) return "music";
  if (pathname.startsWith("/tv")) return "tv";
  if (pathname.startsWith("/movies")) return "movies";
  if (pathname.startsWith("/podcasts")) return "podcasts";
  if (pathname.startsWith("/books")) return "books";
  if (pathname.startsWith("/friends") || pathname.startsWith("/join") || pathname.startsWith("/auth")) return "friends";
  if (pathname.startsWith("/diary") || pathname.startsWith("/u/")) return "profile";
  return "home";
}

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { ready, signedIn } = useTracker();
  const splash =
    (pathname.startsWith("/friends") ||
      pathname.startsWith("/join") ||
      pathname.startsWith("/auth/update-password")) &&
    ready &&
    !signedIn;
  const scene = splash ? "splash" : sceneFromPath(pathname);

  return (
    <>
      <div className="scene-layer" data-scene={scene} aria-hidden>
        <div className="scene-wash" />
      </div>
      <div className="film-grain-overlay" aria-hidden />
      <ServiceWorkerRegister />
      <div className={`app-shell flex min-h-full flex-col ${splash ? "is-splash" : ""}`}>
        <TopBar splash={splash} />
        {!splash && <OnDeckTicker />}
        {!splash && <InstallBanner />}
        <main className="relative z-10 flex-1 animate-fade">{children}</main>
        {!splash && <BottomNav />}
      </div>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <TrackerProvider>
      <Shell>{children}</Shell>
    </TrackerProvider>
  );
}
