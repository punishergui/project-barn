"use client";

import { Plus } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Drawer } from "vaul";

interface FeedItem {
  id: number;
  name: string;
  brand: string;
  qty_bags: number;
  low_stock_threshold: number;
  photo_url: string | null;
}

export default function FeedInventoryPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const res = await fetch("/api/feed-inventory");
        if (!res.ok) {
          console.error("Feed inventory fetch failed:", res.status);
          throw new Error(`Failed to load feed inventory (${res.status})`);
        }
        const data = (await res.json()) as FeedItem[];
        setItems(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load feed inventory";
        setFetchError(message);
      } finally {
        setLoading(false);
      }
    };

    load().catch(() => undefined);
  }, []);

  async function adjustQty(id: number, delta: number) {
    const res = await fetch(`/api/feed-inventory/${id}/qty`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delta })
    });

    if (res.ok) {
      const data = (await res.json()) as { qty_bags: number };
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty_bags: data.qty_bags } : i)));
    } else {
      toast.error("Update failed");
    }
  }

  async function createFeed(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/feed-inventory", {
        method: "POST",
        body: formData,
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Failed to add feed");
      }

      const created = (await response.json()) as { id: number };
      const nextItem: FeedItem = {
        id: created.id,
        name: String(formData.get("name") || ""),
        brand: String(formData.get("brand") || ""),
        qty_bags: Number(formData.get("qty_bags") || 1),
        low_stock_threshold: Number(formData.get("low_stock_threshold") || 2),
        photo_url: null
      };
      setItems((prev) => [nextItem, ...prev]);
      setDrawerOpen(false);
      form.reset();
      toast.success("Feed added");
    } catch {
      toast.error("Failed to add feed");
    }
  }

  return (
    <div className="px-4 pt-4 pb-28">
      <h1 className="mb-4 font-serif text-2xl text-foreground">Feed Inventory</h1>

      {loading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Loading feed inventory...</p>
      ) : fetchError ? (
        <p className="py-12 text-center text-sm text-red-500">{fetchError}</p>
      ) : items.length === 0 ? (
        <div className="px-4 pt-8 text-center">
          <p className="mb-4 text-sm text-muted-foreground">No feed in inventory yet.</p>
          <button
            onClick={() => setDrawerOpen(true)}
            className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium"
          >
            Add First Feed
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-serif text-base text-foreground">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.brand}</p>
                </div>
                {item.qty_bags <= item.low_stock_threshold && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">Low stock</span>
                )}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => adjustQty(item.id, -1).catch(() => undefined)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-lg font-bold text-foreground"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm font-semibold text-foreground">{item.qty_bags}</span>
                <button
                  type="button"
                  onClick={() => adjustQty(item.id, 1).catch(() => undefined)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-lg font-bold text-foreground"
                >
                  +
                </button>
                <span className="text-xs text-muted-foreground">bags</span>
              </div>
              {item.photo_url && <img src={item.photo_url} alt={item.name} className="mt-3 h-24 w-full rounded-xl object-cover" />}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setDrawerOpen(true)}
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
      >
        <Plus size={26} />
      </button>

      <Drawer.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-card p-6 pb-10 shadow-xl">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border" />
            <h2 className="mb-4 font-serif text-xl text-foreground">Add Feed</h2>
            <form onSubmit={(event) => createFeed(event).catch(() => undefined)} className="flex flex-col gap-3">
              <input
                name="name"
                placeholder="Feed name"
                required
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full"
              />
              <input
                name="brand"
                placeholder="Brand"
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full"
              />
              <input
                name="qty_bags"
                type="number"
                defaultValue={1}
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full"
              />
              <input
                name="low_stock_threshold"
                type="number"
                defaultValue={2}
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full"
              />
              <input
                name="photo"
                type="file"
                accept="image/*"
                capture="environment"
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full"
              />
              <button type="submit" className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium">
                Save Feed
              </button>
            </form>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
