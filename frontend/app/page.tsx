export default function HomePage() {
  return (
    <main className="min-h-screen bg-barnBg text-cream p-6">
      <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-white/10 bg-barnCard p-5">
        <p className="text-xs uppercase tracking-[0.1em] text-white/65">Phase 0</p>
        <h1 className="text-3xl font-semibold">Project Barn Frontend</h1>
        <p className="text-sm text-[#B89070]">
          Next.js App Router is now scaffolded in <code>/frontend</code> and ready for incremental migration.
        </p>
        <p className="text-xs text-white/60">
          Existing Flask templates remain in place while API endpoints and page wiring are added in Phase 1.
        </p>
      </div>
    </main>
  );
}
