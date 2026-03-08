import Link from "next/link";

export default function ShellNotFoundPage() {
  return (
    <section className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col items-center justify-center px-6 py-10 text-center bg-background">
      <p className="font-serif text-4xl text-foreground">404</p>
      <p className="mt-3 text-sm text-muted-foreground">The page you requested does not exist or may have been moved.</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link href="/dashboard" className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium">
          Go to dashboard
        </Link>
      </div>
    </section>
  );
}
