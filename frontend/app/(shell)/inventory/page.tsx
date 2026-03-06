"use client";

import { FormEvent, useEffect, useState } from "react";

import { apiClientJson, FamilyInventoryItem, Project } from "@/lib/api";

const categories = ["grooming", "barn supplies", "feed equipment", "tack", "show supplies", "kitchen supplies", "craft supplies", "tools", "garden supplies", "general"];

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
      <h1 className="text-2xl font-semibold">Inventory</h1>

      <form id="inventory-form" onSubmit={(event) => submit(event).catch(() => undefined)} className="barn-card grid gap-2 text-sm">
        <input name="name" placeholder="Item name" required className="rounded bg-black/20 p-2" />
        <div className="grid gap-2 sm:grid-cols-2">
          <select name="category" defaultValue="general" className="rounded bg-black/20 p-2">{categories.map((category) => <option key={category}>{category}</option>)}</select>
          <input name="quantity" type="number" defaultValue="1" step="0.1" placeholder="Quantity" className="rounded bg-black/20 p-2" />
          <input name="unit" placeholder="Unit (optional)" className="rounded bg-black/20 p-2" />
          <input name="location" placeholder="Location" className="rounded bg-black/20 p-2" />
          <input name="condition" placeholder="Condition" className="rounded bg-black/20 p-2" />
          <select name="assigned_project_id" className="rounded bg-black/20 p-2">
            <option value="">Assign to project (optional)</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </div>
        <textarea name="notes" placeholder="Notes" className="rounded bg-black/20 p-2" />
        <label className="flex min-h-11 items-center gap-2 rounded border border-[var(--barn-border)] px-2 py-2"><input name="low_stock" type="checkbox" /> Mark low stock</label>
        <div className="flex gap-2">
          <button className="rounded bg-[var(--barn-red)] px-3 py-2">{editingId ? "Save Item" : "Add Item"}</button>
          {editingId ? <button type="button" onClick={() => setEditingId(null)} className="rounded bg-neutral-700 px-3 py-2">Cancel edit</button> : null}
        </div>
      </form>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <section className="space-y-2">
        {items.length === 0 ? <p className="barn-row text-sm text-[var(--barn-muted)]">No inventory items yet.</p> : null}
        {items.map((item) => (
          <article key={item.id} className="barn-card space-y-1 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-[var(--barn-muted)]">{item.category} • Qty {item.quantity} {item.unit ?? ""}</p>
                <p className="text-xs text-[var(--barn-muted)]">{item.location ?? "No location"} • {item.condition ?? "Condition n/a"}</p>
                <p className="text-xs text-[var(--barn-muted)]">Assigned: {projects.find((project) => project.id === item.assigned_project_id)?.name ?? "None"}</p>
                {item.notes ? <p className="text-xs text-[var(--barn-muted)]">{item.notes}</p> : null}
              </div>
              {item.low_stock ? <span className="rounded bg-amber-600/30 px-2 py-1 text-xs">Low stock</span> : null}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" onClick={() => startEdit(item)} className="rounded bg-neutral-700 px-2 py-1 text-xs">Edit Item</button>
              <button type="button" onClick={() => apiClientJson(`/inventory/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...item, low_stock: !item.low_stock }) }).then(load)} className="rounded bg-neutral-700 px-2 py-1 text-xs">Mark Low Stock</button>
              <button type="button" onClick={() => archive(item.id).catch(() => undefined)} className="rounded bg-neutral-700 px-2 py-1 text-xs">Archive Item</button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
