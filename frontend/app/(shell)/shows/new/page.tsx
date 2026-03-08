"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { apiClientJson } from "@/lib/api";

export default function NewShowPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const show = await apiClientJson<{ id: number }>("/shows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name"), location: form.get("location"), start_date: form.get("start_date"), end_date: form.get("end_date"), notes: form.get("notes") }) });
      router.push(`/shows/${show.id}`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return <form className="space-y-3" onSubmit={submit}>
    <h1 className="text-xl font-semibold text-foreground">New Show</h1>
    {error ? <p className="text-sm text-red-600">{error}</p> : null}
    <input name="name" placeholder="Show name" className="w-full rounded-lg border border-border bg-card p-2 text-sm text-foreground" required />
    <input name="location" placeholder="Location" className="w-full rounded-lg border border-border bg-card p-2 text-sm text-foreground" required />
    <input name="start_date" type="date" className="w-full rounded-lg border border-border bg-card p-2 text-sm text-foreground" required />
    <input name="end_date" type="date" className="w-full rounded-lg border border-border bg-card p-2 text-sm text-foreground" />
    <textarea name="notes" placeholder="Notes" className="w-full rounded-lg border border-border bg-card p-2 text-sm text-foreground" />
    <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" type="submit">Create</button>
  </form>;
}
