"use client";

import { BottomNav } from "@/components/BottomNav";
import { InstallBanner } from "@/components/InstallBanner";
import { OnDeckTicker } from "@/components/OnDeckTicker";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { TopBar } from "@/components/TopBar";
import { TrackerProvider } from "@/lib/tracker";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <TrackerProvider>
      <ServiceWorkerRegister />
      <div className="app-shell flex min-h-full flex-col">
        <TopBar />
        <OnDeckTicker />
        <InstallBanner />
        <main className="flex-1 animate-fade">{children}</main>
        <BottomNav />
      </div>
    </TrackerProvider>
  );
}
