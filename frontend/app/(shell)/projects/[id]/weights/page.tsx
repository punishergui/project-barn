"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import WeightChart from "@/components/WeightChart";
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
      <header>
        <h1 className="mb-1 font-serif text-2xl text-foreground">Weights</h1>
        <p className="text-sm text-muted-foreground">Track weigh-ins and quick trends for this project.</p>
      </header>

      {latestWeight !== null ? (
        <section className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
          <div>
            <p className="text-sm text-muted-foreground">Latest</p>
            <p className="text-2xl font-semibold text-foreground">{latestWeight} lbs</p>
          </div>
          {changeFromPrevious !== null ? (
            <span
              className={
                changeFromPrevious > 0
                  ? "rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700"
                  : changeFromPrevious < 0
                    ? "rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-600"
                    : "rounded-full bg-secondary px-3 py-1 text-sm font-medium text-muted-foreground"
              }
            >
              {changeFromPrevious > 0
                ? `+${changeFromPrevious} lbs`
                : changeFromPrevious < 0
                  ? `${changeFromPrevious} lbs`
                  : "No change"}
            </span>
          ) : null}
        </section>
      ) : null}

      <WeightChart entries={rows} targetWeight={undefined} />

      <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Add Entry</h2>
        <div className="grid grid-cols-2 gap-2">
          <input
            name="recorded_at"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            required
          />
          <input
            name="weight_lbs"
            type="number"
            step="0.1"
            required
            placeholder="Weight (lbs)"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
        </div>
        <textarea
          name="notes"
          className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
          placeholder="Notes"
          rows={2}
        />
        <button
          disabled={isSubmitting}
          className="mt-3 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "Add Entry"}
        </button>
      </form>

      {errorMessage ? <p className="text-sm text-red-500">{errorMessage}</p> : null}

      {isLoading ? <p className="text-sm text-muted-foreground">Loading entries...</p> : null}

      {!isLoading && rows.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">No weight entries yet.</p>
      ) : null}

      <div className="space-y-2">
        {rows.map((entry) => (
          <article key={entry.id} className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">{formatDate(entry.recorded_at)} • {entry.weight_lbs} lbs</p>
              {entry.notes ? <p className="mt-0.5 text-xs text-muted-foreground">{entry.notes}</p> : null}
            </div>
            <button
              type="button"
              onClick={() => removeWeightEntry(entry.id).catch(() => undefined)}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground disabled:opacity-50"
              disabled={deletingId === entry.id}
            >
              {deletingId === entry.id ? "Removing..." : "Remove"}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
