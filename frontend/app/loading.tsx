export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-6 py-10">
      <div className="animate-pulse space-y-3 text-center">
        <div className="mx-auto h-8 w-40 rounded bg-neutral-800" />
        <div className="mx-auto h-4 w-56 rounded bg-neutral-900" />
      </div>
    </main>
  );
}
