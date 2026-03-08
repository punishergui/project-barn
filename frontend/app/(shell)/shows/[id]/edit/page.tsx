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
    return <p className="px-4 py-4 text-sm text-red-600">{error}</p>;
  }

  if (!show || !auth) {
    return <p className="px-4 py-4 text-sm text-muted-foreground">Loading show...</p>;
  }

  if (!(auth.role === "parent" && auth.is_unlocked)) {
    return (
      <div className="space-y-3 px-4 py-4 text-sm">
        <p className="rounded-lg border border-border bg-card px-3 py-2 text-foreground">This page requires parent unlock.</p>
        <Link href="/more" className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline">
          Go to parent unlock
        </Link>
      </div>
    );
  }

  return (
    <form className="space-y-3 px-4 pb-4" onSubmit={submit}>
      <h1 className="text-xl font-semibold text-foreground">Edit Show</h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <input name="name" defaultValue={show.name} placeholder="Show name" className="w-full rounded-lg border border-border bg-card p-2 text-sm text-foreground" required />
      <input name="location" defaultValue={show.location} placeholder="Location" className="w-full rounded-lg border border-border bg-card p-2 text-sm text-foreground" required />
      <input name="start_date" defaultValue={show.start_date ? show.start_date.slice(0, 10) : ""} type="date" className="w-full rounded-lg border border-border bg-card p-2 text-sm text-foreground" required />
      <input name="end_date" defaultValue={show.end_date ? show.end_date.slice(0, 10) : ""} type="date" className="w-full rounded-lg border border-border bg-card p-2 text-sm text-foreground" />
      <textarea name="notes" defaultValue={show.notes ?? ""} placeholder="Notes" className="w-full rounded-lg border border-border bg-card p-2 text-sm text-foreground" rows={4} />
      <div className="flex gap-2">
        <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
        <Link href={`/shows/${params.id}`} className="rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground">
          Cancel
        </Link>
      </div>
    </form>
  );
}
