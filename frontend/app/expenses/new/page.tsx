"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { apiClientJson, Expense, ExpenseAllocation, ExpenseReceipt, Project } from "@/lib/api";

type AllocationRow = { id: number; project_id: string; amount: string; percent: string };

export default function NewExpensePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedProject = searchParams.get("project_id") ?? "";
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [amount, setAmount] = useState("0");
  const [rows, setRows] = useState<AllocationRow[]>([{ id: Date.now(), project_id: preselectedProject, amount: "", percent: "" }]);
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [receiptCaption, setReceiptCaption] = useState("");

  useEffect(() => { apiClientJson<Project[]>("/projects").then(setProjects).catch(() => setProjects([])); }, []);

  const totalCents = Math.round((Number(amount) || 0) * 100);

  const preview = useMemo(() => {
    if (!splitEnabled) return { allocations: [] as Array<{ project_id: number; amount_cents: number }>, remainingCents: 0 };
    const validRows = rows.filter((row) => Number(row.project_id) > 0);
    if (validRows.length === 1 && !validRows[0].amount && !validRows[0].percent) {
      return { allocations: [{ project_id: Number(validRows[0].project_id), amount_cents: totalCents }], remainingCents: 0 };
    }
    const allocations = validRows.map((row) => {
      if (Number(row.amount) > 0) {
        return { project_id: Number(row.project_id), amount_cents: Math.round(Number(row.amount) * 100) };
      }
      return { project_id: Number(row.project_id), amount_cents: Math.round(totalCents * (Number(row.percent) / 100)) };
    }).filter((row) => row.amount_cents > 0);
    const allocated = allocations.reduce((sum, row) => sum + row.amount_cents, 0);
    return { allocations, remainingCents: totalCents - allocated };
  }, [rows, splitEnabled, totalCents]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      const created = await apiClientJson<Expense>("/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())) });

      if (splitEnabled) {
        if (preview.allocations.length === 0) {
          setError("Add at least one valid allocation row.");
          return;
        }
        if (preview.remainingCents !== 0) {
          setError("Allocations must equal the full expense total.");
          return;
        }
        await apiClientJson<ExpenseAllocation[]>(`/expenses/${created.id}/allocations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ allocations: preview.allocations }) });
      }

      for (const file of receiptFiles) {
        const form = new FormData();
        form.set("file", file);
        form.set("caption", receiptCaption);
        await apiClientJson<ExpenseReceipt>(`/expenses/${created.id}/receipts`, { method: "POST", body: form });
      }

      router.push(`/expenses/${created.id}`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return <form onSubmit={submit} className="space-y-3 rounded-lg border border-white/10 bg-neutral-900 p-4">
    <h1 className="text-xl font-semibold">New Expense</h1>
    <select name="project_id" defaultValue={preselectedProject} className="w-full rounded bg-neutral-800 p-2">{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
    <input name="date" type="date" required className="w-full rounded bg-neutral-800 p-2" />
    <input name="category" required placeholder="Category" className="w-full rounded bg-neutral-800 p-2" />
    <input name="vendor" placeholder="Vendor" className="w-full rounded bg-neutral-800 p-2" />
    <input name="amount" type="number" step="0.01" required placeholder="Amount" className="w-full rounded bg-neutral-800 p-2" onChange={(e) => setAmount(e.target.value)} />
    <textarea name="note" placeholder="Note" className="w-full rounded bg-neutral-800 p-2" />

    <section className="space-y-2 rounded border border-white/10 p-3">
      <h2 className="font-semibold">Receipt photos</h2>
      <input type="file" accept=".png,.jpg,.jpeg,.webp" multiple className="w-full rounded bg-neutral-800 p-2 text-sm" onChange={(e) => setReceiptFiles(Array.from(e.target.files ?? []))} />
      <input value={receiptCaption} onChange={(e) => setReceiptCaption(e.target.value)} placeholder="Caption for uploaded receipts" className="w-full rounded bg-neutral-800 p-2 text-sm" />
      {receiptFiles.length > 0 ? <p className="text-xs text-neutral-300">{receiptFiles.length} file(s) selected</p> : null}
    </section>

    <section className="space-y-2 rounded border border-white/10 p-3">
      <div className="flex items-center justify-between"><h2 className="font-semibold">Split allocations</h2><label className="text-sm"><input type="checkbox" checked={splitEnabled} onChange={(e) => setSplitEnabled(e.target.checked)} className="mr-2" />Split this expense</label></div>
      {splitEnabled ? <>
        <div className="space-y-2">{rows.map((row) => <div key={row.id} className="grid grid-cols-12 gap-2 text-sm"><select value={row.project_id} onChange={(e) => setRows((prev) => prev.map((item) => item.id === row.id ? ({ ...item, project_id: e.target.value }) : item))} className="col-span-5 rounded bg-neutral-800 p-2"><option value="">Project</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><input type="number" step="0.01" value={row.amount} onChange={(e) => setRows((prev) => prev.map((item) => item.id === row.id ? ({ ...item, amount: e.target.value, percent: "" }) : item))} placeholder="Amount" className="col-span-3 rounded bg-neutral-800 p-2" /><input type="number" step="0.01" value={row.percent} onChange={(e) => setRows((prev) => prev.map((item) => item.id === row.id ? ({ ...item, percent: e.target.value, amount: "" }) : item))} placeholder="%" className="col-span-3 rounded bg-neutral-800 p-2" /><button type="button" onClick={() => setRows((prev) => prev.length > 1 ? prev.filter((item) => item.id !== row.id) : prev)} className="col-span-1 rounded bg-neutral-700">×</button></div>)}</div>
        <div className="flex items-center justify-between"><button type="button" onClick={() => setRows((prev) => [...prev, { id: Date.now() + prev.length, project_id: "", amount: "", percent: "" }])} className="rounded bg-neutral-800 px-3 py-2 text-sm">Add allocation</button><p className={`text-sm ${preview.remainingCents === 0 ? "text-green-300" : "text-yellow-300"}`}>Remaining ${(preview.remainingCents / 100).toFixed(2)}</p></div>
      </> : null}
    </section>

    {error ? <p className="text-red-300">{error}</p> : null}
    <button disabled={splitEnabled && preview.remainingCents !== 0} className="rounded bg-red-700 px-3 py-2 disabled:opacity-50">Create</button>
  </form>;
}
