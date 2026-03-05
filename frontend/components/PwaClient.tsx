"use client";

import { useEffect, useState } from "react";

export default function PwaClient() {
  const [offline, setOffline] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    const onOffline = () => setOffline(true);
    const onOnline = () => setOffline(false);
    setOffline(!navigator.onLine);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    const beforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };
    window.addEventListener("beforeinstallprompt", beforeInstallPrompt);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("beforeinstallprompt", beforeInstallPrompt);
    };
  }, []);

  const install = async () => {
    const promptEvent = deferredPrompt as Event & { prompt?: () => Promise<void> };
    if (!promptEvent?.prompt) return;
    await promptEvent.prompt();
    setDeferredPrompt(null);
  };

  return <>{offline ? <div className="fixed left-0 right-0 top-14 z-30 bg-amber-600 px-4 py-2 text-center text-sm">Offline mode</div> : null}{deferredPrompt ? <button onClick={install} className="fixed bottom-20 right-4 z-30 rounded bg-blue-700 px-3 py-2 text-sm">Install App</button> : null}</>;
}
