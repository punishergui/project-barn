"use client";

import { Plus } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Drawer } from "vaul";

import { apiClientJson } from "@/lib/api";

interface FeedInventoryBag {
  id: number;
  name: string;
  brand: string | null;
  qty_bags: number;
  low_stock_threshold: number;
  photo_url: string | null;
}

export default function FeedInventoryPage() {
  const [items, setItems] = useState<FeedInventoryBag[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  async function loadInventory() {
    const data = await apiClientJson<FeedInventoryBag[]>("/feed-inventory");
    setItems(data);
  }

  useEffect(() => {
    loadInventory().catch(() => {
      toast.error("Failed to load feed inventory");
    });
  }, []);

  async function adjustQty(itemId: number, delta: number) {
    try {
      const response = await apiClientJson<{ qty_bags: number }>(`/feed-inventory/${itemId}/qty`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta })
      });

      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                qty_bags: response.qty_bags
              }
            : item
        )
      );
    } catch {
      toast.error("Update failed");
    }
  }

  async function createFeed(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    try {
      await apiClientJson<{ id: number }>("/feed-inventory", {
        method: "POST",
        body: formData
      });
      setDrawerOpen(false);
      event.currentTarget.reset();
      await loadInventory();
      toast.success("Feed added");
    } catch {
      toast.error("Failed to add feed");
    }
  }

  return (
    <div className="space-y-3 pb-28">
      {items.map((item) => (
        <div key={item.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-serif text-base text-foreground">{item.name}</p>
              <p className="text-sm text-muted-foreground">{item.brand || ""}</p>
            </div>
            {item.qty_bags <= item.low_stock_threshold && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">Low stock</span>
            )}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => adjustQty(item.id, -1)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-lg font-bold text-foreground"
            >
              −
            </button>
            <span className="w-8 text-center text-sm font-semibold text-foreground">{item.qty_bags}</span>
            <button
              type="button"
              onClick={() => adjustQty(item.id, 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-lg font-bold text-foreground"
            >
              +
            </button>
            <span className="text-xs text-muted-foreground">bags</span>
          </div>
          {item.photo_url && <img src={item.photo_url} alt={item.name} className="mt-3 h-24 w-full rounded-xl object-cover" />}
        </div>
      ))}

      <Drawer.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-card p-6 pb-10 shadow-xl">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border" />
            <h2 className="mb-4 font-serif text-xl text-foreground">Add Feed</h2>
            <form onSubmit={(event) => createFeed(event).catch(() => undefined)} className="flex flex-col gap-3">
              <input name="name" required placeholder="Feed name" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground" />
              <input name="brand" placeholder="Brand" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground" />
              <input name="qty_bags" type="number" defaultValue={1} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground" />
              <input name="low_stock_threshold" type="number" defaultValue={2} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground" />
              <input name="photo" type="file" accept="image/*" capture="environment" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground" />
              <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                Save Feed
              </button>
            </form>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
        aria-label="Add feed"
      >
        <Plus size={20} />
      </button>
    </div>
  );
}
