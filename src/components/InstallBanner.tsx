"use client";

import { useEffect, useState } from "react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

export function InstallBanner() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [standalone, setStandalone] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const standaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator &&
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    setStandalone(standaloneMode);
    const ua = navigator.userAgent;
    setIos(/iPhone|iPad|iPod/.test(ua) && !standaloneMode);

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  if (standalone || dismissed) return null;
  if (!deferred && !ios) return null;

  return (
    <div className="mx-auto max-w-lg px-3 pt-3">
      <div className="flex items-start gap-3 rounded-2xl border border-black/10 bg-[#F6F7F9] p-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm">Install Currently On</p>
          <p className="text-xs text-black/50">
            {ios
              ? "In Safari, tap Share, then Add to Home Screen."
              : "Add this app to your phone for a full-screen, app-like experience."}
          </p>
        </div>
        {deferred && (
          <button
            type="button"
            className="shrink-0 rounded-xl bg-[#14161A] px-3 py-2 text-xs text-white"
            onClick={async () => {
              await deferred.prompt();
              setDeferred(null);
            }}
          >
            Install
          </button>
        )}
        <button
          type="button"
          className="text-xs text-black/40"
          onClick={() => setDismissed(true)}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
