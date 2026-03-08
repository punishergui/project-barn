"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { apiClientJson, FeedInventoryItem } from "@/lib/api";

function shortDate(value: string | null) {
  if (!value) return "No updates";
  return new Date(value).toLocaleDateString();
}

const fieldClassName =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

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
      <section className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-foreground">Feed Inventory</h1>
          <p className="text-sm text-muted-foreground">
            {items.length} items • {lowStockCount} low stock
          </p>
        </div>
        <Link href="/projects" className="text-sm text-muted-foreground underline-offset-2 hover:underline">
          Projects
        </Link>
      </section>

      <section className="mb-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Add Feed Item</h2>
        <form onSubmit={(event) => createItem(event).catch((err) => setError((err as Error).message))} className="grid gap-2">
          <input name="name" required placeholder="Feed name" className={fieldClassName} />
          <div className="grid grid-cols-2 gap-2">
            <input name="brand" placeholder="Brand" className={fieldClassName} />
            <input name="category" placeholder="Category" className={fieldClassName} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input name="qty_on_hand" type="number" step="0.1" placeholder="Qty on hand" className={fieldClassName} />
            <input name="unit" required defaultValue="lb" className={fieldClassName} />
            <input name="low_stock_threshold" type="number" step="0.1" placeholder="Low stock at" className={fieldClassName} />
          </div>
          <textarea name="notes" placeholder="Notes" className={fieldClassName} />
          <button className="mt-1 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground">Add Feed Item</button>
        </form>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      </section>

      <section className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-sm">
            <p>No feed inventory yet.</p>
            <p>Add your first feed item above, then use project feed logs to track daily use.</p>
            <Link href="/projects" className="underline-offset-2 hover:underline">
              Open projects to log feed
            </Link>
          </div>
        ) : null}
        {items.map((item) => (
          <article key={item.id} className="rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{item.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {item.brand || "No brand"} • {item.category || "Uncategorized"}
                </p>
                <p className="mt-1 text-sm text-foreground">
                  {item.qty_on_hand} {item.unit} on hand
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">Updated {shortDate(item.updated_at)}</p>
              </div>
              {item.low_stock ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">Low stock</span>
              ) : null}
            </div>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => promptQtyAdjust(item).catch((err) => setError((err as Error).message))}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground"
              >
                Adjust Qty
              </button>
              <Link href="/projects" className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground">
                Log Feeding
              </Link>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
