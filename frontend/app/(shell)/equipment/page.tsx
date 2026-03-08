"use client";

import { FormEvent, useEffect, useState } from "react";
import { Package } from "lucide-react";

import { apiClientJson, AuthStatus, EquipmentItem } from "@/lib/api";
import { toUserErrorMessage } from "@/lib/errorMessage";

const fieldClassName =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

type EquipmentFormState = {
  name: string;
  category: string;
  description: string;
  purchase_date: string;
  purchase_price: string;
  useful_life_years: string;
  vendor: string;
  notes: string;
};

const initialFormState: EquipmentFormState = {
  name: "",
  category: "equipment",
  description: "",
  purchase_date: "",
  purchase_price: "",
  useful_life_years: "",
  vendor: "",
  notes: ""
};

export default function EquipmentPage() {
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formState, setFormState] = useState<EquipmentFormState>(initialFormState);
  const [error, setError] = useState<string | null>(null);

  const isParent = auth?.role === "parent";

  const load = async () => {
    try {
      const [equipmentData, authData] = await Promise.all([
        apiClientJson<EquipmentItem[]>("/equipment"),
        apiClientJson<AuthStatus>("/auth/status")
      ]);
      setItems(equipmentData);
      setAuth(authData);
      setError(null);
    } catch (loadError) {
      setError(toUserErrorMessage(loadError, "Unable to load equipment right now."));
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setFormState(initialFormState);
  };

  const createOrUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      name: formState.name,
      category: formState.category,
      description: formState.description || null,
      purchase_date: formState.purchase_date || null,
      purchase_price: formState.purchase_price || null,
      useful_life_years: formState.useful_life_years || null,
      vendor: formState.vendor || null,
      notes: formState.notes || null
    };

    try {
      if (editingId) {
        await apiClientJson(`/equipment/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        await apiClientJson("/equipment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      resetForm();
      setShowForm(false);
      await load();
    } catch (submitError) {
      setError(toUserErrorMessage(submitError, "Unable to save equipment right now."));
    }
  };

  const deleteItem = async (id: number) => {
    try {
      await apiClientJson(`/equipment/${id}`, { method: "DELETE" });
      await load();
    } catch (deleteError) {
      setError(toUserErrorMessage(deleteError, "Unable to delete equipment right now."));
    }
  };

  const startEdit = (item: EquipmentItem) => {
    setEditingId(item.id);
    setShowForm(true);
    setFormState({
      name: item.name,
      category: item.category || "equipment",
      description: item.description ?? "",
      purchase_date: item.purchase_date ? item.purchase_date.slice(0, 10) : "",
      purchase_price: item.purchase_price != null ? String(item.purchase_price) : "",
      useful_life_years: item.useful_life_years != null ? String(item.useful_life_years) : "",
      vendor: item.vendor ?? "",
      notes: item.notes ?? ""
    });
  };

  const estimatedTotal = items.reduce((sum, item) => sum + (item.estimated_current_value ?? 0), 0);

  return (
    <div className="space-y-4 pb-4">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-foreground">Equipment</h1>
          <p className="text-sm text-muted-foreground">Track reusable assets and depreciation</p>
        </div>
        {isParent ? (
          <button
            type="button"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            onClick={() => {
              if (showForm) {
                resetForm();
              }
              setShowForm((prev) => !prev);
            }}
          >
            {showForm ? "Cancel" : "Add Equipment"}
          </button>
        ) : null}
      </header>

      {showForm ? (
        <form onSubmit={createOrUpdate} className="mb-4 rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">{editingId ? "Edit Equipment" : "Add Equipment"}</h2>
          <div className="grid gap-3">
            <input
              required
              value={formState.name}
              onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Name"
              className={fieldClassName}
            />
            <select
              value={formState.category}
              onChange={(event) => setFormState((prev) => ({ ...prev, category: event.target.value }))}
              className={fieldClassName}
            >
              <option value="equipment">equipment</option>
              <option value="halter">halter</option>
              <option value="show_box">show_box</option>
              <option value="grooming">grooming</option>
              <option value="feed_equipment">feed_equipment</option>
              <option value="trailer">trailer</option>
              <option value="clothing">clothing</option>
              <option value="tools">tools</option>
              <option value="other">other</option>
            </select>
            <input
              value={formState.description}
              onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Description"
              className={fieldClassName}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={formState.purchase_date}
                onChange={(event) => setFormState((prev) => ({ ...prev, purchase_date: event.target.value }))}
                className={fieldClassName}
              />
              <input
                type="number"
                step="0.01"
                value={formState.purchase_price}
                onChange={(event) => setFormState((prev) => ({ ...prev, purchase_price: event.target.value }))}
                placeholder="Purchase price"
                className={fieldClassName}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={formState.useful_life_years}
                onChange={(event) => setFormState((prev) => ({ ...prev, useful_life_years: event.target.value }))}
                placeholder="Useful life (years)"
                className={fieldClassName}
              />
              <input
                value={formState.vendor}
                onChange={(event) => setFormState((prev) => ({ ...prev, vendor: event.target.value }))}
                placeholder="Vendor"
                className={fieldClassName}
              />
            </div>
            <textarea
              rows={2}
              value={formState.notes}
              onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder="Notes"
              className={fieldClassName}
            />
            <button type="submit" className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground">
              {editingId ? "Save Equipment" : "Add Equipment"}
            </button>
          </div>
        </form>
      ) : null}

      {items.length > 0 ? (
        <section className="mb-2 flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
          <div>
            <p className="text-sm text-muted-foreground">Total items</p>
            <p className="text-base font-semibold text-foreground">{items.length}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Est. total value</p>
            <p className="text-base font-semibold text-foreground">${estimatedTotal.toFixed(2)}</p>
          </div>
        </section>
      ) : null}

      <section>
        {items.map((item) => (
          <article key={item.id} className="mb-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">{item.name}</p>
                <span className="mt-0.5 inline-flex rounded-full bg-secondary px-2 py-0.5 text-[10px] capitalize text-muted-foreground">{item.category}</span>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {[item.vendor, item.description].filter(Boolean).join(" • ") || "No vendor or description"}
                </p>
              </div>
              {item.estimated_current_value != null ? (
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">Est. value</p>
                  <p className="text-sm font-semibold text-foreground">${item.estimated_current_value.toFixed(2)}</p>
                </div>
              ) : (
                <Package className="h-4 w-4 text-muted-foreground" />
              )}
            </div>

            {item.purchase_price != null ? (
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>Purchased: ${item.purchase_price.toFixed(2)}</span>
                {item.depreciation_per_year != null ? <span>Depr: ${item.depreciation_per_year.toFixed(2)}/yr</span> : null}
                {item.purchase_date ? <span>Date: {item.purchase_date.slice(0, 10)}</span> : null}
              </div>
            ) : null}

            {isParent ? (
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(item)}
                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteItem(item.id).catch(() => undefined)}
                  className="rounded-lg border border-red-200 bg-background px-3 py-1.5 text-xs text-red-500"
                >
                  Delete
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
