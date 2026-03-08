"use client";

import { FormEvent, useEffect, useState } from "react";

import { apiClientJson, IncomeEntry, IncomeType, Project, Profile } from "@/lib/api";

const incomeTypes: IncomeType[] = ["auction_sale", "add_on", "sponsorship", "private_sale", "prize_money", "refund", "other"];

function toAmount(value: FormDataEntryValue | null) {
  return Number.parseFloat(String(value ?? "0")) || 0;
}

export default function IncomePage() {
  const [entries, setEntries] = useState<IncomeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = async () => {
    const [incomeRows, projectRows, profileRows] = await Promise.all([
      apiClientJson<IncomeEntry[]>("/income"),
      apiClientJson<Project[]>("/projects"),
      apiClientJson<Profile[]>("/profiles")
    ]);
    setEntries(incomeRows);
    setProjects(projectRows);
    setProfiles(profileRows);
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  const saveEntry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      date: String(form.get("date") || ""),
      project_id: Number(form.get("project_id")),
      profile_id: Number(form.get("profile_id")),
      type: String(form.get("type") || "other"),
      source: String(form.get("source") || "").trim() || null,
      amount: toAmount(form.get("amount")),
      notes: String(form.get("notes") || "").trim() || null
    };

    if (editingId) {
      await apiClientJson(`/income/${editingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } else {
      await apiClientJson("/income", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }

    event.currentTarget.reset();
    setEditingId(null);
    await load();
  };

  const editEntry = (row: IncomeEntry) => {
    const form = document.getElementById("income-form") as HTMLFormElement | null;
    if (!form) return;
    (form.elements.namedItem("date") as HTMLInputElement).value = row.date.slice(0, 10);
    (form.elements.namedItem("project_id") as HTMLSelectElement).value = String(row.project_id);
    (form.elements.namedItem("profile_id") as HTMLSelectElement).value = String(row.profile_id ?? "");
    (form.elements.namedItem("type") as HTMLSelectElement).value = row.type;
    (form.elements.namedItem("source") as HTMLInputElement).value = row.source ?? "";
    (form.elements.namedItem("amount") as HTMLInputElement).value = row.amount.toFixed(2);
    (form.elements.namedItem("notes") as HTMLTextAreaElement).value = row.notes ?? "";
    setEditingId(row.id);
  };

  const removeEntry = async (id: number) => {
    await apiClientJson(`/income/${id}`, { method: "DELETE" });
    if (editingId === id) setEditingId(null);
    await load();
  };

  const total = entries.reduce((sum, row) => sum + row.amount, 0);

  return (
    <div className="w-full space-y-4 pb-5">
      <section>
        <h1 className="mb-4 font-serif text-2xl text-foreground">Income</h1>
        <p className="text-sm text-muted-foreground">Track auction payouts, add-ons, sponsorships, and other project income.</p>
        <p className="text-sm font-medium text-green-600">Total income ${total.toFixed(2)}</p>
      </section>

      <form id="income-form" className="rounded-2xl bg-card border border-border shadow-sm p-4 mb-4 grid gap-2" onSubmit={(event) => saveEntry(event).catch(() => undefined)}>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{editingId ? "Edit Income" : "Add Income"}</h2>
        <input name="date" type="date" required className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <select name="project_id" required className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="">Select project</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
        <select name="profile_id" className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="">Default profile</option>
          {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
        </select>
        <select name="type" defaultValue="other" className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30">
          {incomeTypes.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
        <input name="source" placeholder="Source / buyer / sponsor" className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <input name="amount" type="number" step="0.01" min="0" required placeholder="Amount" className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <textarea name="notes" placeholder="Notes" className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30" rows={3} />
        <div className="flex gap-2">
          <button className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium">{editingId ? "Save Income" : "Add Income"}</button>
          {editingId ? <button type="button" className="bg-secondary text-foreground rounded-xl px-4 py-2 text-sm" onClick={() => setEditingId(null)}>Cancel</button> : null}
        </div>
      </form>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Income Entries</h2>
          <a className="text-xs text-primary" href="/api/income.csv">Export CSV</a>
        </div>
        {entries.length === 0 ? <p className="text-sm text-muted-foreground">No income entries yet.</p> : null}
        {entries.map((row) => (
          <article key={row.id} className="rounded-2xl bg-card border border-border shadow-sm px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold text-base text-green-600">${row.amount.toFixed(2)}</p>
              <span className="rounded-full bg-secondary text-muted-foreground text-[10px] px-2 py-0.5 capitalize">{row.type}</span>
            </div>
            <p className="text-xs text-muted-foreground">{projects.find((project) => project.id === row.project_id)?.name ?? `Project ${row.project_id}`} • {new Date(row.date).toLocaleDateString()}</p>
            <p className="text-xs text-muted-foreground">{row.source || "No source"}</p>
            {row.notes ? <p className="text-xs text-muted-foreground">{row.notes}</p> : null}
            <div className="mt-2 flex gap-2">
              <button type="button" className="bg-secondary text-foreground rounded-xl px-4 py-2 text-sm" onClick={() => editEntry(row)}>Edit Income</button>
              <button type="button" className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium" onClick={() => removeEntry(row.id).catch(() => undefined)}>Delete Income</button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
