"use client";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-6 py-10">
      <div className="w-full space-y-3 rounded border border-red-500/40 bg-red-950/30 p-4 text-center">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="text-sm text-red-200">{error.message}</p>
        <button onClick={reset} className="rounded bg-red-700 px-3 py-2">
          Try again
        </button>
      </div>
    </main>
  );
}
