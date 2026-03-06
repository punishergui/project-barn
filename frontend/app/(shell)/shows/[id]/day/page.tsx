"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

export default function LegacyShowDayRedirectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const dayId = searchParams.get("dayId");
    if (dayId) {
      router.replace(`/shows/${params.id}/day/${dayId}`);
      return;
    }
    router.replace(`/shows/${params.id}`);
  }, [params.id, router, searchParams]);

  return <p className="px-4 py-4 text-sm text-[var(--barn-muted)]">Opening show day…</p>;
}
