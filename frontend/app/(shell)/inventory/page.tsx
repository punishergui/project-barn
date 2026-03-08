"use client";

import { FormEvent, useEffect, useState } from "react";

import { apiClientJson, FamilyInventoryItem, Project } from "@/lib/api";

const categories = ["grooming", "barn supplies", "feed equipment", "tack", "show supplies", "kitchen supplies", "craft supplies", "tools", "garden supplies", "general"];

const fieldClassName =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

export default function InventoryPage() {
  const [items, setItems] = useState<FamilyInventoryItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const [itemData, projectData] = await Promise.all([apiClientJson<FamilyInventoryItem[]>("/inventory"), apiClientJson<Project[]>("/projects")]);
    setItems(itemData);
    setProjects(projectData);
  };

  useEffect(() => {
    load().catch((err) => setError((err as Error).message));
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      if (editingId) {
        await apiClientJson(`/inventory/${editingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      } else {
        await apiClientJson("/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      }
      event.currentTarget.reset();
      setEditingId(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const archive = async (id: number) => {
    await apiClientJson(`/inventory/${id}`, { method: "DELETE" });
    await load();
  };

  const startEdit = (item: FamilyInventoryItem) => {
    const form = document.getElementById("inventory-form") as HTMLFormElement | null;
    if (!form) return;
    (form.elements.namedItem("name") as HTMLInputElement).value = item.name;
    (form.elements.namedItem("category") as HTMLSelectElement).value = item.category;
    (form.elements.namedItem("quantity") as HTMLInputElement).value = String(item.quantity);
    (form.elements.namedItem("unit") as HTMLInputElement).value = item.unit ?? "";
    (form.elements.namedItem("location") as HTMLInputElement).value = item.location ?? "";
    (form.elements.namedItem("condition") as HTMLInputElement).value = item.condition ?? "";
    (form.elements.namedItem("assigned_project_id") as HTMLSelectElement).value = item.assigned_project_id ? String(item.assigned_project_id) : "";
    (form.elements.namedItem("notes") as HTMLTextAreaElement).value = item.notes ?? "";
    (form.elements.namedItem("low_stock") as HTMLInputElement).checked = item.low_stock;
    setEditingId(item.id);
  };

  return (
    <div className="w-full space-y-4 px-4 pb-4">
      <h1 className="mb-4 font-serif text-2xl text-foreground">Inventory</h1>

      <form id="inventory-form" onSubmit={(event) => submit(event).catch(() => undefined)} className="mb-4 grid gap-2 rounded-2xl border border-border bg-card p-4 text-sm">
        <h2 className="mb-3 text-sm font-semibold">{editingId ? "Edit Item" : "Add Item"}</h2>
        <input name="name" placeholder="Item name" required className={fieldClassName} />
        <div className="grid gap-2 sm:grid-cols-2">
          <select name="category" defaultValue="general" className={fieldClassName}>
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
          <input name="quantity" type="number" defaultValue="1" step="0.1" placeholder="Quantity" className={fieldClassName} />
          <input name="unit" placeholder="Unit (optional)" className={fieldClassName} />
          <input name="location" placeholder="Location" className={fieldClassName} />
          <input name="condition" placeholder="Condition" className={fieldClassName} />
          <select name="assigned_project_id" className={fieldClassName}>
            <option value="">Assign to project (optional)</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
        <textarea name="notes" placeholder="Notes" className={fieldClassName} />
        <label className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-foreground">
          <input name="low_stock" type="checkbox" /> Mark low stock
        </label>
        <div className="mt-1 flex gap-2">
          <button className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">{editingId ? "Save Item" : "Add Item"}</button>
          {editingId ? (
            <button type="button" onClick={() => setEditingId(null)} className="rounded-xl bg-secondary px-4 py-2 text-sm text-foreground">
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <section className="space-y-2">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-sm">
            <p>No inventory items yet.</p>
            <p>Add a tool, supply, or material above to keep family inventory organized.</p>
          </div>
        ) : null}
        {items.map((item) => (
          <article key={item.id} className="mb-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">{item.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {item.category} • Qty {item.quantity} {item.unit ?? ""}
                </p>
                <p className="text-xs text-muted-foreground">{item.location ?? "No location"} • {item.condition ?? "Condition n/a"}</p>
                <p className="text-xs text-muted-foreground">Assigned: {projects.find((project) => project.id === item.assigned_project_id)?.name ?? "None"}</p>
                {item.notes ? <p className="text-xs italic text-muted-foreground">{item.notes}</p> : null}
              </div>
              {item.low_stock ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">Low stock</span>
              ) : null}
            </div>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => startEdit(item)} className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground">
                Edit
              </button>
              <button
                type="button"
                onClick={() =>
                  apiClientJson(`/inventory/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...item, low_stock: !item.low_stock }) }).then(load)
                }
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground"
              >
                Toggle Low Stock
              </button>
              <button
                type="button"
                onClick={() => archive(item.id).catch(() => undefined)}
                className="rounded-lg border border-red-200 bg-background px-3 py-1.5 text-xs text-red-500"
              >
                Archive
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
