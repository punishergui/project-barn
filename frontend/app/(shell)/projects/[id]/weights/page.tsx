"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { apiClientJson, WeightEntry } from "@/lib/api";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

export default function ProjectWeightsPage() {
  const { id } = useParams<{ id: string }>();
  const [rows, setRows] = useState<WeightEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await apiClientJson<WeightEntry[]>(`/projects/${id}/weights`);
      setRows(data);
      setErrorMessage(null);
    } catch {
      setErrorMessage("Unable to load weight entries right now.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [id]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setIsSubmitting(true);
    try {
      await apiClientJson(`/projects/${id}/weights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recorded_at: form.get("recorded_at"),
          weight_lbs: Number(form.get("weight_lbs")),
          notes: form.get("notes")
        })
      });
      event.currentTarget.reset();
      setErrorMessage(null);
      await load();
    } catch {
      setErrorMessage("Could not save this weight entry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeWeightEntry = async (entryId: number) => {
    setDeletingId(entryId);
    try {
      await apiClientJson(`/weights/${entryId}`, { method: "DELETE" });
      setErrorMessage(null);
      await load();
    } catch {
      setErrorMessage("Could not remove this weight entry.");
    } finally {
      setDeletingId(null);
    }
  };

  const latestWeight = rows[0]?.weight_lbs ?? null;
  const previousWeight = rows[1]?.weight_lbs ?? null;
  const changeFromPrevious = useMemo(() => {
    if (latestWeight === null || previousWeight === null) return null;
    return Number((latestWeight - previousWeight).toFixed(1));
  }, [latestWeight, previousWeight]);

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Weights</h1>
        <p className="text-sm text-[var(--barn-muted)]">Track weigh-ins and quick trends for this project.</p>
        {latestWeight !== null ? (
          <p className="text-sm text-[var(--barn-muted)]">
            Latest: <span className="font-semibold text-white">{latestWeight} lbs</span>
            {changeFromPrevious !== null ? (
              <span> ({changeFromPrevious >= 0 ? "+" : ""}{changeFromPrevious} since previous entry)</span>
            ) : null}
          </p>
        ) : null}
      </header>

      <form onSubmit={submit} className="grid gap-3 rounded-lg border border-white/10 bg-neutral-900 p-3">
        <input
          name="recorded_at"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="rounded bg-neutral-800 p-2"
          required
        />
        <input
          name="weight_lbs"
          type="number"
          step="0.1"
          required
          placeholder="Weight (lbs)"
          className="rounded bg-neutral-800 p-2"
        />
        <textarea name="notes" className="rounded bg-neutral-800 p-2" placeholder="Notes" rows={3} />
        <button disabled={isSubmitting} className="rounded bg-blue-700 px-3 py-2 text-sm font-medium disabled:opacity-50">
          {isSubmitting ? "Saving..." : "Add entry"}
        </button>
      </form>

      {errorMessage ? <p className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-200">{errorMessage}</p> : null}

      {isLoading ? <p className="text-sm text-[var(--barn-muted)]">Loading entries...</p> : null}

      {!isLoading && rows.length === 0 ? (
        <p className="rounded-lg border border-white/10 bg-neutral-900 p-3 text-sm text-[var(--barn-muted)]">No weight entries yet.</p>
      ) : null}

      <div className="space-y-2">
        {rows.map((entry) => (
          <article key={entry.id} className="rounded-lg border border-white/10 bg-neutral-900 p-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{formatDate(entry.recorded_at)} • {entry.weight_lbs} lbs</p>
                {entry.notes ? <p className="mt-1 text-[var(--barn-muted)]">{entry.notes}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => removeWeightEntry(entry.id).catch(() => undefined)}
                className="rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/10 disabled:opacity-50"
                disabled={deletingId === entry.id}
              >
                {deletingId === entry.id ? "Removing..." : "Remove"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
