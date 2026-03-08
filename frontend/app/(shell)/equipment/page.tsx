"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { FamilyInventoryItem, apiClientJson } from "@/lib/api";
import { toUserErrorMessage } from "@/lib/errorMessage";

const equipmentCategories = new Set(["feed equipment", "tools", "tack", "show supplies"]);

export default function EquipmentPage() {
  const [items, setItems] = useState<FamilyInventoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClientJson<FamilyInventoryItem[]>("/inventory")
      .then((data) => setItems(data))
      .catch((err) => setError(toUserErrorMessage(err, "Unable to load equipment right now.")));
  }, []);

  const equipmentItems = useMemo(
    () => items.filter((item) => equipmentCategories.has(item.category.toLowerCase())),
    [items]
  );

  const lowStockCount = equipmentItems.filter((item) => item.low_stock).length;

  return (
    <div className="w-full space-y-4 pb-4">
      <header className="rounded-2xl border border-border bg-card px-4 py-3">
        <h1 className="font-serif text-2xl text-foreground">Equipment</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track feed equipment, tack, tools, and show supplies in one place.</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {equipmentItems.length} total items • {lowStockCount} low stock
        </p>
      </header>

      <section className="space-y-2">
        {equipmentItems.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
            No equipment tracked yet. Add items from the{" "}
            <Link href="/inventory" className="text-primary">
              inventory page
            </Link>
            .
          </div>
        ) : null}

        {equipmentItems.map((item) => (
          <article key={item.id} className="rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.category} • Qty {item.quantity} {item.unit ?? ""}
                </p>
                <p className="text-xs text-muted-foreground">{item.location ?? "No location"}</p>
              </div>
              {item.low_stock ? <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-foreground">Low stock</span> : null}
            </div>
            {item.notes ? <p className="mt-2 text-xs italic text-muted-foreground">{item.notes}</p> : null}
          </article>
        ))}
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
