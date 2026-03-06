"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
};

const INSTALL_BANNER_DISMISSED_KEY = "barn-install-banner-dismissed";

export default function PwaClient() {
  const [offline, setOffline] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    setDismissed(window.localStorage.getItem(INSTALL_BANNER_DISMISSED_KEY) === "1");

    const onOffline = () => setOffline(true);
    const onOnline = () => setOffline(false);
    setOffline(!navigator.onLine);

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    const beforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setDismissed(false);
    };

    window.addEventListener("beforeinstallprompt", beforeInstallPrompt);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("beforeinstallprompt", beforeInstallPrompt);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    setDeferredPrompt(null);
    setDismissed(true);
    window.localStorage.setItem(INSTALL_BANNER_DISMISSED_KEY, "1");
  };

  const hideBanner = () => {
    setDismissed(true);
    window.localStorage.setItem(INSTALL_BANNER_DISMISSED_KEY, "1");
  };

  return (
    <>
      {offline ? <div className="fixed left-0 right-0 top-[calc(var(--barn-header-height)+env(safe-area-inset-top))] z-30 bg-amber-600 px-4 py-2 text-center text-sm">Offline mode</div> : null}
      {deferredPrompt && !dismissed ? (
        <div className="fixed bottom-[calc(var(--barn-bottom-nav-height)+env(safe-area-inset-bottom)+12px)] right-4 z-30 flex items-center gap-2 rounded-lg border border-[var(--barn-border)] bg-[var(--barn-dark)] p-2 text-sm">
          <span>Install Project Barn</span>
          <button onClick={install} className="rounded bg-[var(--barn-red)] px-2 py-1 text-white">Install</button>
          <button onClick={hideBanner} className="rounded border border-[var(--barn-border)] px-2 py-1">Later</button>
        </div>
      ) : null}
    </>
  );
}
