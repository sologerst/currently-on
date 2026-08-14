"use client";

import { InstallBanner } from "@/components/InstallBanner";
import { OnDeckTicker } from "@/components/OnDeckTicker";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { TopBar } from "@/components/TopBar";
import { TrackerProvider } from "@/lib/tracker";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <TrackerProvider>
      <ServiceWorkerRegister />
      <TopBar />
      <OnDeckTicker />
      <InstallBanner />
      <main className="flex-1">{children}</main>
    </TrackerProvider>
  );
}
