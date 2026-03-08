"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { apiClientJson, CareEntry, FeedEntry, FeedInventoryItem } from "@/lib/api";

const quickCareCategories = ["feed", "water", "grooming", "exercise", "health check"] as const;

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

export default function ProjectFeedPage() {
  const { id } = useParams<{ id: string }>();
  const [rows, setRows] = useState<FeedEntry[]>([]);
  const [inventory, setInventory] = useState<FeedInventoryItem[]>([]);
  const [careRows, setCareRows] = useState<CareEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const [feedRows, inventoryRows, careData] = await Promise.all([
      apiClientJson<FeedEntry[]>(`/projects/${id}/feed`),
      apiClientJson<FeedInventoryItem[]>("/feed"),
      apiClientJson<CareEntry[]>(`/projects/${id}/care`).catch(() => [])
    ]);
    setRows(feedRows);
    setInventory(inventoryRows);
    setCareRows(careData);
  };

  useEffect(() => {
    load().catch((err) => setError((err as Error).message));
  }, [id]);

  const recentFeedSuggestions = useMemo(() => {
    const values = rows.map((row) => row.feed_type).filter(Boolean);
    return [...new Set(values)].slice(0, 5);
  }, [rows]);

  const submitFeed = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    await apiClientJson(`/projects/${id}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recorded_at: form.get("recorded_at"),
        feed_inventory_item_id: form.get("feed_inventory_item_id") ? Number(form.get("feed_inventory_item_id")) : null,
        feed_type: String(form.get("feed_type") || "").trim() || null,
        amount: Number(form.get("amount")),
        unit: form.get("unit"),
        cost: form.get("cost") ? Number(form.get("cost")) : null,
        notes: String(form.get("notes") || "").trim() || null,
        decrement_inventory: form.get("decrement_inventory") === "on"
      })
    });

    event.currentTarget.reset();
    setError(null);
    await load();
  };

  const addCare = async (category: string) => {
    await apiClientJson(`/projects/${id}/care`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category,
        recorded_at: isoToday(),
        title: category === "health check" ? "Health Check" : `Care: ${category}`
      })
    });
    await load();
  };

  return (
    <div className="space-y-4 px-4 pb-6">
      <section className="rounded-2xl bg-card border border-border shadow-sm p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Project Feed & Care</h1>
          <Link href="/feed" className="text-sm text-primary underline">Inventory</Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickCareCategories.map((category) => (
            <button key={category} type="button" onClick={() => addCare(category).catch((err) => setError((err as Error).message))} className="rounded-lg border border-border px-3 py-2 text-xs">
              {category === "health check" ? "Health Check" : `Mark ${category}`}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-card border border-border shadow-sm p-4 space-y-2">
        <h2 className="text-base font-semibold">Log Feed</h2>
        <form onSubmit={(event) => submitFeed(event).catch((err) => setError((err as Error).message))} className="grid gap-2">
          <input name="recorded_at" type="date" defaultValue={isoToday()} required className="rounded-lg bg-background p-3" />
          <select name="feed_inventory_item_id" className="rounded-lg bg-background p-3">
            <option value="">Select inventory item (optional)</option>
            {inventory.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.qty_on_hand} {item.unit})</option>)}
          </select>
          <input name="feed_type" list="feed-suggestions" placeholder="Feed type (or leave blank when selecting inventory)" className="rounded-lg bg-background p-3" />
          <datalist id="feed-suggestions">
            {recentFeedSuggestions.map((value) => <option key={value} value={value} />)}
          </datalist>
          <div className="grid grid-cols-2 gap-2">
            <input name="amount" type="number" step="0.1" required placeholder="Amount" className="rounded-lg bg-background p-3" />
            <input name="unit" defaultValue="lb" required className="rounded-lg bg-background p-3" />
          </div>
          <input name="cost" type="number" step="0.01" placeholder="Optional cost" className="rounded-lg bg-background p-3" />
          <textarea name="notes" placeholder="Notes" className="rounded-lg bg-background p-3" />
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input name="decrement_inventory" type="checkbox" defaultChecked />
            Decrement inventory quantity
          </label>
          <button className="rounded-lg bg-primary px-3 py-3 text-sm font-semibold text-primary-foreground">Log Feeding</button>
        </form>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
      </section>

      <section className="rounded-2xl bg-card border border-border shadow-sm p-4 space-y-2">
        <h2 className="text-base font-semibold">Recent Feed Entries</h2>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">No feed entries yet.</p> : rows.slice(0, 12).map((row) => (
          <article key={row.id} className="rounded-lg border border-border bg-background p-3 text-sm">
            <p className="font-medium">{row.feed_type} • {row.amount} {row.unit}</p>
            <p className="text-xs text-muted-foreground">{formatDate(row.recorded_at)}{row.cost !== null ? ` • $${row.cost.toFixed(2)}` : ""}</p>
            {row.notes ? <p className="text-xs text-muted-foreground">{row.notes}</p> : null}
          </article>
        ))}
      </section>

      <section className="rounded-2xl bg-card border border-border shadow-sm p-4 space-y-2">
        <h2 className="text-base font-semibold">Recent Care Entries</h2>
        {careRows.length === 0 ? <p className="text-sm text-muted-foreground">No care entries yet.</p> : careRows.slice(0, 8).map((row) => (
          <article key={row.id} className="rounded-lg border border-border bg-background p-3 text-sm">
            <p className="font-medium">{row.label}</p>
            <p className="text-xs text-muted-foreground">{formatDate(row.recorded_at)}</p>
            {row.notes ? <p className="text-xs text-muted-foreground">{row.notes}</p> : null}
          </article>
        ))}
      </section>
    </div>
  );
}
