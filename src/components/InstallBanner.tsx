"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

function subscribeNoop() {
  return () => {};
}

function getStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function getIsIos() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) && !getStandalone();
}

export function InstallBanner() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const standalone = useSyncExternalStore(
    subscribeNoop,
    getStandalone,
    () => true,
  );
  const ios = useSyncExternalStore(subscribeNoop, getIsIos, () => false);

  useEffect(() => {
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
      <div className="flex items-start gap-3 rounded-[1.25rem] bg-surface p-3.5">
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm">Install Currently On</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            {ios
              ? "In Safari, tap Share, then Add to Home Screen."
              : "Add this app to your phone for a full-screen experience."}
          </p>
        </div>
        {deferred && (
          <button
            type="button"
            className="btn-primary shrink-0 bg-foreground"
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
          className="shrink-0 text-xs text-muted"
          onClick={() => setDismissed(true)}
        >
          Later
        </button>
      </div>
    </div>
  );
}
