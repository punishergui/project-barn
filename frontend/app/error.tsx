"use client";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return <div className="space-y-3 rounded border border-red-500/40 bg-red-950/30 p-4"><h2 className="text-lg font-semibold">Something went wrong</h2><p className="text-sm text-red-200">{error.message}</p><button onClick={reset} className="rounded bg-red-700 px-3 py-2">Try again</button></div>;
}
