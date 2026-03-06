"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { apiClientJson, FeedInventoryItem } from "@/lib/api";

function shortDate(value: string | null) {
  if (!value) return "No updates";
  return new Date(value).toLocaleDateString();
}

export default function FeedInventoryPage() {
  const [items, setItems] = useState<FeedInventoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const response = await apiClientJson<FeedInventoryItem[]>("/feed");
    setItems(response);
  };

  useEffect(() => {
    load().catch((err) => setError((err as Error).message));
  }, []);

  const lowStockCount = useMemo(() => items.filter((item) => item.low_stock).length, [items]);

  const createItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    await apiClientJson("/feed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(form.get("name") || "").trim(),
        brand: String(form.get("brand") || "").trim() || null,
        category: String(form.get("category") || "").trim() || null,
        unit: String(form.get("unit") || "").trim(),
        qty_on_hand: Number(form.get("qty_on_hand") || 0),
        low_stock_threshold: form.get("low_stock_threshold") ? Number(form.get("low_stock_threshold")) : null,
        notes: String(form.get("notes") || "").trim() || null
      })
    });

    event.currentTarget.reset();
    setError(null);
    await load();
  };

  const updateQty = async (item: FeedInventoryItem, quantity: number) => {
    await apiClientJson(`/feed/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qty_on_hand: quantity })
    });
    await load();
  };

  const promptQtyAdjust = async (item: FeedInventoryItem) => {
    const nextRaw = window.prompt(`Set quantity on hand for ${item.name} (${item.unit})`, String(item.qty_on_hand));
    if (nextRaw === null) return;
    const nextQty = Number(nextRaw);
    if (!Number.isFinite(nextQty) || nextQty < 0) {
      setError("Quantity must be a non-negative number.");
      return;
    }
    setError(null);
    await updateQty(item, Number(nextQty.toFixed(2)));
  };

  return (
    <div className="space-y-4 px-4 pb-6">
      <section className="barn-card space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">Feed Inventory</h1>
          <Link href="/projects" className="see-all-link">Projects</Link>
        </div>
        <p className="text-sm text-[var(--barn-muted)]">{items.length} items • {lowStockCount} low stock</p>
      </section>

      <section className="barn-card space-y-2">
        <h2 className="text-base font-semibold">Add Feed Item</h2>
        <form onSubmit={(event) => createItem(event).catch((err) => setError((err as Error).message))} className="grid gap-2">
          <input name="name" required placeholder="Feed name" className="rounded-lg bg-[var(--barn-bg)] p-3 text-base" />
          <div className="grid grid-cols-2 gap-2">
            <input name="brand" placeholder="Brand" className="rounded-lg bg-[var(--barn-bg)] p-3 text-base" />
            <input name="category" placeholder="Category" className="rounded-lg bg-[var(--barn-bg)] p-3 text-base" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input name="qty_on_hand" type="number" step="0.1" placeholder="Qty on hand" className="rounded-lg bg-[var(--barn-bg)] p-3 text-base" />
            <input name="unit" required defaultValue="lb" className="rounded-lg bg-[var(--barn-bg)] p-3 text-base" />
            <input name="low_stock_threshold" type="number" step="0.1" placeholder="Low stock at" className="rounded-lg bg-[var(--barn-bg)] p-3 text-base" />
          </div>
          <textarea name="notes" placeholder="Notes" className="rounded-lg bg-[var(--barn-bg)] p-3 text-base" />
          <button className="rounded-lg bg-[var(--barn-red)] px-4 py-3 text-sm font-semibold text-white">Add Feed Item</button>
        </form>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
      </section>

      <section className="space-y-3">
        {items.length === 0 ? (
          <div className="barn-card space-y-2 text-sm text-[var(--barn-muted)]">
            <p>No feed inventory yet.</p>
            <p>Add your first feed item above, then use project feed logs to track daily use.</p>
            <Link href="/projects" className="see-all-link">Open projects to log feed</Link>
          </div>
        ) : null}
        {items.map((item) => (
          <article key={item.id} className="barn-card space-y-2 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold">{item.name}</p>
                <p className="text-xs text-[var(--barn-muted)]">{item.brand || "No brand"} • {item.category || "Uncategorized"}</p>
              </div>
              {item.low_stock ? <span className="rounded-full bg-yellow-500/20 px-2 py-1 text-xs text-yellow-200">Low stock</span> : null}
            </div>
            <p>{item.qty_on_hand} {item.unit} on hand</p>
            <p className="text-xs text-[var(--barn-muted)]">Updated {shortDate(item.updated_at)}</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => promptQtyAdjust(item).catch((err) => setError((err as Error).message))}
                className="rounded-lg border border-[var(--barn-border)] px-3 py-2"
              >
                Adjust Qty
              </button>
              <Link href="/projects" className="rounded-lg border border-[var(--barn-border)] px-3 py-2 text-center">Log Feeding</Link>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
