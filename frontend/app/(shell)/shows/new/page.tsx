"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { apiClientJson } from "@/lib/api";
import { toUserErrorMessage } from "@/lib/errorMessage";

const fieldClassName =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

export default function NewShowPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      const show = await apiClientJson<{ id: number }>("/shows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          location: form.get("location"),
          start_date: form.get("start_date"),
          end_date: form.get("end_date"),
          notes: form.get("notes")
        })
      });

      router.push(`/shows/${show.id}`);
    } catch (e) {
      setError(toUserErrorMessage(e, "Unable to create show right now."));
    }
  };

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-background px-4 pb-28 pt-6">
      <h1 className="mb-4 font-serif text-2xl text-foreground">New Show</h1>
      <form className="space-y-3 rounded-2xl border border-border bg-card p-4" onSubmit={submit}>
        <input name="name" placeholder="Show name" className={fieldClassName} required />
        <input name="location" placeholder="Location" className={fieldClassName} required />
        <div className="grid grid-cols-2 gap-2">
          <input name="start_date" type="date" className={fieldClassName} required />
          <input name="end_date" type="date" className={fieldClassName} />
        </div>
        <textarea name="notes" placeholder="Notes" rows={3} className={fieldClassName} />
        <button className="mt-1 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground" type="submit">
          Create
        </button>
      </form>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
