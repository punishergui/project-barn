"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { apiClientJson, Expense, ExpenseAllocation, Project } from "@/lib/api";

type Mode = "dollars" | "percent";

export default function NewExpensePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [mode, setMode] = useState<Mode>("dollars");
  const [amount, setAmount] = useState("0");
  const [dollars, setDollars] = useState<Record<number, string>>({});
  const [percents, setPercents] = useState<Record<number, string>>({});

  useEffect(() => { apiClientJson<Project[]>("/projects").then(setProjects).catch(() => setProjects([])); }, []);
  const totalCents = Math.round((Number(amount) || 0) * 100);

  const allocationPreview = useMemo(() => {
    if (!splitEnabled) return [] as Array<{ project_id: number; amount_cents: number }>;
    if (mode === "percent") {
      return projects.map((p) => ({ project_id: p.id, amount_cents: Math.round(totalCents * (Number(percents[p.id] ?? 0) / 100)) })).filter((x) => x.amount_cents > 0);
    }
    return projects.map((p) => ({ project_id: p.id, amount_cents: Math.round((Number(dollars[p.id] ?? 0) || 0) * 100) })).filter((x) => x.amount_cents > 0);
  }, [splitEnabled, mode, projects, dollars, percents, totalCents]);

  const allocatedCents = allocationPreview.reduce((sum, row) => sum + row.amount_cents, 0);
  const remainingCents = totalCents - allocatedCents;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      const created = await apiClientJson<Expense>("/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())) });
      if (splitEnabled) {
        if (allocationPreview.length === 0) {
          setError("Split is enabled, but no allocations were entered.");
          return;
        }
        if (remainingCents !== 0) {
          setError("Allocations must match expense total exactly.");
          return;
        }
        await apiClientJson<ExpenseAllocation[]>(`/expenses/${created.id}/allocations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ allocations: allocationPreview }) });
      }
      router.push(`/expenses/${created.id}/edit`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return <form onSubmit={submit} className="space-y-3 rounded-lg border border-white/10 bg-neutral-900 p-4">
    <h1 className="text-xl font-semibold">New Expense</h1>
    <select name="project_id" className="w-full rounded bg-neutral-800 p-2">{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
    <input name="date" type="date" required className="w-full rounded bg-neutral-800 p-2" />
    <input name="category" required placeholder="Category" className="w-full rounded bg-neutral-800 p-2" />
    <input name="vendor" placeholder="Vendor" className="w-full rounded bg-neutral-800 p-2" />
    <input name="amount" type="number" step="0.01" required placeholder="Amount" className="w-full rounded bg-neutral-800 p-2" onChange={(e) => setAmount(e.target.value)} />
    <textarea name="note" placeholder="Note" className="w-full rounded bg-neutral-800 p-2" />

    <section className="space-y-2 rounded border border-white/10 p-3">
      <div className="flex items-center justify-between"><h2 className="font-semibold">Split Across Projects</h2><label className="text-sm"><input type="checkbox" checked={splitEnabled} onChange={(e) => setSplitEnabled(e.target.checked)} className="mr-2" />Split this expense across projects</label></div>
      {splitEnabled ? <>
        <div className="flex gap-2 text-sm"><button type="button" onClick={() => setMode("dollars")} className={`rounded px-2 py-1 ${mode === "dollars" ? "bg-red-700" : "bg-neutral-800"}`}>Dollars</button><button type="button" onClick={() => setMode("percent")} className={`rounded px-2 py-1 ${mode === "percent" ? "bg-red-700" : "bg-neutral-800"}`}>Percent</button><button type="button" className="rounded bg-neutral-800 px-2 py-1" onClick={() => {
          if (projects.length === 0) return;
          const equalPercent = 100 / projects.length;
          setPercents(Object.fromEntries(projects.map((p) => [p.id, equalPercent.toFixed(2)])));
        }}>Equal Split</button></div>
        <div className="space-y-2">{projects.map((p) => <div key={p.id} className="flex items-center justify-between gap-2 text-sm"><span>{p.name}</span><input type="number" step="0.01" value={mode === "dollars" ? (dollars[p.id] ?? "") : (percents[p.id] ?? "")} onChange={(e) => mode === "dollars" ? setDollars((prev) => ({ ...prev, [p.id]: e.target.value })) : setPercents((prev) => ({ ...prev, [p.id]: e.target.value }))} placeholder={mode === "dollars" ? "$0.00" : "%"} className="w-32 rounded bg-neutral-800 p-1" /></div>)}</div>
        <p className={`text-sm ${remainingCents === 0 ? "text-green-300" : "text-yellow-300"}`}>Remaining: ${(remainingCents / 100).toFixed(2)}</p>
      </> : null}
    </section>

    {error ? <p className="text-red-300">{error}</p> : null}
    <button disabled={splitEnabled && remainingCents !== 0} className="rounded bg-red-700 px-3 py-2 disabled:opacity-50">Create</button>
  </form>;
}
