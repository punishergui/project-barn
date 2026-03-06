"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { apiClientJson, AuthStatus, Show } from "@/lib/api";

export default function EditShowPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [show, setShow] = useState<Show | null>(null);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      apiClientJson<Show>(`/shows/${params.id}`),
      apiClientJson<AuthStatus>("/auth/status")
    ])
      .then(([showData, authData]) => {
        setShow(showData);
        setAuth(authData);
      })
      .catch((loadError) => setError((loadError as Error).message));
  }, [params.id]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError(null);

    try {
      await apiClientJson(`/shows/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(form.get("name") || "").trim(),
          location: String(form.get("location") || "").trim(),
          start_date: form.get("start_date") || null,
          end_date: form.get("end_date") || null,
          notes: String(form.get("notes") || "").trim() || null
        })
      });
      router.push(`/shows/${params.id}`);
      router.refresh();
    } catch (submitError) {
      setError((submitError as Error).message);
      setSaving(false);
    }
  };

  if (error && !show) {
    return <p className="px-4 py-4 text-sm text-red-300">{error}</p>;
  }

  if (!show || !auth) {
    return <p className="px-4 py-4 text-sm text-[var(--barn-muted)]">Loading show...</p>;
  }

  if (!(auth.role === "parent" && auth.is_unlocked)) {
    return (
      <div className="space-y-3 px-4 py-4 text-sm">
        <p className="barn-card">This page requires parent unlock.</p>
        <Link href="/more" className="see-all-link">
          Go to parent unlock
        </Link>
      </div>
    );
  }

  return (
    <form className="space-y-3 px-4 pb-4" onSubmit={submit}>
      <h1 className="text-xl font-semibold">Edit Show</h1>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <input name="name" defaultValue={show.name} placeholder="Show name" className="w-full rounded bg-neutral-900 p-2" required />
      <input name="location" defaultValue={show.location} placeholder="Location" className="w-full rounded bg-neutral-900 p-2" required />
      <input name="start_date" defaultValue={show.start_date ? show.start_date.slice(0, 10) : ""} type="date" className="w-full rounded bg-neutral-900 p-2" required />
      <input name="end_date" defaultValue={show.end_date ? show.end_date.slice(0, 10) : ""} type="date" className="w-full rounded bg-neutral-900 p-2" />
      <textarea name="notes" defaultValue={show.notes ?? ""} placeholder="Notes" className="w-full rounded bg-neutral-900 p-2" rows={4} />
      <div className="flex gap-2">
        <button className="rounded bg-blue-700 px-4 py-2" type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
        <Link href={`/shows/${params.id}`} className="rounded bg-neutral-700 px-4 py-2">
          Cancel
        </Link>
      </div>
    </form>
  );
}
