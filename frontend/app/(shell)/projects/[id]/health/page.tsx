"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { apiClientJson, HealthEntry } from "@/lib/api";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function formatCurrency(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export default function ProjectHealthPage() {
  const { id } = useParams<{ id: string }>();
  const [rows, setRows] = useState<HealthEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await apiClientJson<HealthEntry[]>(`/projects/${id}/health`);
      setRows(data);
      setErrorMessage(null);
    } catch {
      setErrorMessage("Unable to load health entries right now.");
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
      await apiClientJson(`/projects/${id}/health`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recorded_at: form.get("recorded_at"),
          category: form.get("category"),
          description: form.get("description"),
          cost: form.get("cost") || null,
          vendor: form.get("vendor") || null,
          attachment_receipt_url: form.get("attachment_receipt_url") || null
        })
      });
      event.currentTarget.reset();
      setErrorMessage(null);
      await load();
    } catch {
      setErrorMessage("Could not save this health entry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeEntry = async (entryId: number) => {
    setDeletingId(entryId);
    try {
      await apiClientJson(`/health/${entryId}`, { method: "DELETE" });
      setErrorMessage(null);
      await load();
    } catch {
      setErrorMessage("Could not remove this health entry.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Health</h1>
        <p className="text-sm text-[var(--barn-muted)]">Record treatments, vaccinations, and injuries for this project.</p>
      </header>

      <form onSubmit={submit} className="grid gap-3 rounded-lg border border-white/10 bg-neutral-900 p-3">
        <input
          name="recorded_at"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="rounded bg-neutral-800 p-2"
          required
        />
        <select name="category" className="rounded bg-neutral-800 p-2" required>
          <option value="treatment">Treatment</option>
          <option value="vaccination">Vaccination</option>
          <option value="injury">Injury</option>
          <option value="note">Note</option>
        </select>
        <textarea name="description" required className="rounded bg-neutral-800 p-2" placeholder="Description" rows={3} />
        <input name="cost" type="number" step="0.01" placeholder="Cost" className="rounded bg-neutral-800 p-2" />
        <input name="vendor" placeholder="Vendor" className="rounded bg-neutral-800 p-2" />
        <input name="attachment_receipt_url" type="url" placeholder="Receipt URL" className="rounded bg-neutral-800 p-2" />
        <button disabled={isSubmitting} className="rounded bg-blue-700 px-3 py-2 text-sm font-medium disabled:opacity-50">
          {isSubmitting ? "Saving..." : "Add entry"}
        </button>
      </form>

      {errorMessage ? <p className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-200">{errorMessage}</p> : null}
      {isLoading ? <p className="text-sm text-[var(--barn-muted)]">Loading entries...</p> : null}

      {!isLoading && rows.length === 0 ? (
        <p className="rounded-lg border border-white/10 bg-neutral-900 p-3 text-sm text-[var(--barn-muted)]">No health entries yet.</p>
      ) : null}

      <div className="space-y-2">
        {rows.map((entry) => (
          <article key={entry.id} className="rounded-lg border border-white/10 bg-neutral-900 p-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{formatDate(entry.recorded_at)} • {entry.category}</p>
                <p className="mt-1 text-[var(--barn-muted)]">{entry.description}</p>
                <p className="mt-1 text-[var(--barn-muted)]">
                  Cost: <span className="text-white">{formatCurrency(entry.cost)}</span>
                  {entry.vendor ? <span> • Vendor: {entry.vendor}</span> : null}
                </p>
                {entry.attachment_receipt_url ? (
                  <a
                    href={entry.attachment_receipt_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-blue-300 underline"
                  >
                    View receipt
                  </a>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => removeEntry(entry.id).catch(() => undefined)}
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
